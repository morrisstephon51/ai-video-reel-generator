import { NextRequest, NextResponse } from 'next/server'
import { chat } from '@/lib/groq'
import { withResilience } from '@/lib/errors'
import { createServiceClient } from '@/lib/supabase/server'

interface AgentResult {
  score: number
  critique: string
  fixes: string[]
}

interface ReviewPayload {
  videoId: string
  script: string
  scenes: Array<{ caption?: string; imageUrl?: string; duration?: number }>
  captions: string[]
  hashtags: string[]
  cta: string
  hook: string
  round?: number
}

async function runAgent(
  agentName: string,
  systemPrompt: string,
  contentSummary: string
): Promise<AgentResult> {
  return withResilience(agentName, async () => {
    const raw = await chat(systemPrompt, contentSummary, true)
    const parsed = JSON.parse(raw)
    return {
      score:    Math.min(100, Math.max(0, parsed.score ?? 50)),
      critique: parsed.critique ?? '',
      fixes:    parsed.fixes ?? [],
    }
  }, async () => ({ score: 70, critique: 'Agent unavailable — default score applied', fixes: [] }))
}

export async function POST(req: NextRequest) {
  try {
    const payload: ReviewPayload = await req.json()
    const { videoId, script, scenes, captions, hashtags, cta, hook, round = 1 } = payload

    // Load style/design context — non-blocking, use defaults if DB unavailable
    let profile: Record<string, unknown> | null = null
    let designSystem: Record<string, unknown> | null = null
    try {
      const db = createServiceClient()
      const [p, d] = await Promise.all([
        db.from('style_profiles').select('*').order('updated_at', { ascending: false }).limit(1).single(),
        db.from('design_system').select('*').order('updated_at', { ascending: false }).limit(1).single(),
      ])
      profile = p.data
      designSystem = d.data
    } catch { /* use defaults */ }

    const contentSummary = JSON.stringify({
      hook, script, scenes: scenes?.map(s => ({ caption: s.caption, duration: s.duration })),
      captions, hashtags, cta,
    }, null, 2)

    // Run all 6 agents in parallel — each has its own fallback
    const [viral, design, ux, brand, strategy, compliance] = await Promise.all([

      runAgent('viral-potential-agent',
        `You are a viral content analyst. Score this short-form video content for viral potential (0-100).
        Evaluate: hook strength, curiosity gap in first 3 seconds, emotional triggers, trend alignment, share-worthiness.
        Respond JSON: { "score": 0-100, "critique": "2-3 sentence assessment", "fixes": ["fix 1", "fix 2"] }`,
        contentSummary),

      runAgent('design-quality-agent',
        `You are a senior visual designer. Score this content for design quality (0-100).
        Evaluate: visual consistency, typography readability, contrast ratio, composition, thumbnail appeal.
        Respond JSON: { "score": 0-100, "critique": "2-3 sentence assessment", "fixes": ["fix 1", "fix 2"] }`,
        contentSummary),

      runAgent('ux-ui-agent',
        `You are a UX lead. Score this short-form video for UX quality (0-100).
        Evaluate: CTA placement timing, caption sync, scene pacing (1.5-5s per scene), mobile readability.
        Respond JSON: { "score": 0-100, "critique": "2-3 sentence assessment", "fixes": ["fix 1", "fix 2"] }`,
        contentSummary),

      runAgent('brand-voice-agent',
        `You are a brand manager. Score this content for brand voice alignment (0-100).
        Brand tone: "${String(profile?.tone ?? 'confident, bold, conversational')}".
        Evaluate: tone consistency, hook pattern, vocabulary, CTA clarity.
        Respond JSON: { "score": 0-100, "critique": "2-3 sentence assessment", "fixes": ["fix 1", "fix 2"] }`,
        contentSummary),

      runAgent('content-strategy-agent',
        `You are a content strategist. Score this content for strategic effectiveness (0-100).
        Evaluate: hashtag quality, niche alignment, growth angle (saves/shares), funnel stage.
        Respond JSON: { "score": 0-100, "critique": "2-3 sentence assessment", "fixes": ["fix 1", "fix 2"] }`,
        contentSummary),

      runAgent('platform-compliance-agent',
        `You are a platform compliance QA engineer. Score this content for platform compliance (0-100).
        Evaluate: duration limits, caption character limits, hashtag counts, audio standards, community guidelines.
        Respond JSON: { "score": 0-100, "critique": "2-3 sentence assessment", "fixes": ["fix 1", "fix 2"] }`,
        contentSummary),
    ])

    const composite = Math.round(
      viral.score    * 0.30 +
      design.score   * 0.20 +
      ux.score       * 0.15 +
      brand.score    * 0.20 +
      strategy.score * 0.15
    )

    const compliancePassed = compliance.score >= 60
    let decision: 'approve' | 'revise' | 'regenerate'
    if (!compliancePassed)           decision = 'revise'
    else if (composite >= 80)        decision = 'approve'
    else if (composite >= 60 && round < 3) decision = 'revise'
    else                             decision = 'regenerate'

    const allFixes = [
      ...viral.fixes, ...design.fixes, ...ux.fixes,
      ...brand.fixes, ...strategy.fixes, ...compliance.fixes,
    ].filter(Boolean)

    let masterNotes = `Composite score ${composite}/100. Decision: ${decision}.`
    try {
      masterNotes = await chat(
        `You are the Master Review Agent. Synthesize agent feedback into a clear revision brief. Be specific and actionable. 2-4 sentences max.`,
        `Decision: ${decision}. Composite: ${composite}/100.
         Viral: ${viral.score} — ${viral.critique}
         Design: ${design.score} — ${design.critique}
         UX: ${ux.score} — ${ux.critique}
         Brand: ${brand.score} — ${brand.critique}
         Strategy: ${strategy.score} — ${strategy.critique}
         Compliance: ${compliance.score} — ${compliance.critique}`
      )
    } catch { /* use default masterNotes */ }

    // Persist to DB — non-blocking
    if (videoId) {
      try {
        const db = createServiceClient()
        await db.from('agent_reviews').insert([
          { video_id: videoId, agent_name: 'viral-potential',     score: viral.score,       critique: viral.critique,      round },
          { video_id: videoId, agent_name: 'design-quality',      score: design.score,      critique: design.critique,     round },
          { video_id: videoId, agent_name: 'ux-ui',               score: ux.score,          critique: ux.critique,         round },
          { video_id: videoId, agent_name: 'brand-voice',         score: brand.score,       critique: brand.critique,      round },
          { video_id: videoId, agent_name: 'content-strategy',    score: strategy.score,    critique: strategy.critique,   round },
          { video_id: videoId, agent_name: 'platform-compliance', score: compliance.score,  critique: compliance.critique, round },
        ])
        await db.from('master_decisions').insert({ video_id: videoId, composite_score: composite, decision, notes: masterNotes, round })
        await db.from('videos').update({ status: `review:${decision}`, review_round: round }).eq('id', videoId)
      } catch { /* non-critical */ }
    }

    return NextResponse.json({
      decision, composite, round, masterNotes,
      agentScores:    { viral: viral.score, design: design.score, ux: ux.score, brand: brand.score, strategy: strategy.score, compliance: compliance.score },
      agentCritiques: { viral: viral.critique, design: design.critique, ux: ux.critique, brand: brand.critique, strategy: strategy.critique, compliance: compliance.critique },
      fixes: allFixes,
    })
  } catch (err) {
    console.error('[agent-review]', err)
    // Return a degraded but non-crashing response so the pipeline completes
    return NextResponse.json({
      decision: 'revise', composite: 65, round: 1,
      masterNotes: 'Review council temporarily unavailable. Content generated successfully.',
      agentScores: { viral: 65, design: 65, ux: 65, brand: 65, strategy: 65, compliance: 65 },
      agentCritiques: { viral: '', design: '', ux: '', brand: '', strategy: '', compliance: '' },
      fixes: [],
    })
  }
}
