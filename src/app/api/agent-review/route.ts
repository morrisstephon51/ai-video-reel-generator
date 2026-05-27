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

// Each agent runs independently and returns a score + actionable critique
async function runAgent(
  agentName: string,
  systemPrompt: string,
  contentSummary: string
): Promise<AgentResult> {
  return withResilience(agentName, async () => {
    const raw = await chat(
      systemPrompt,
      contentSummary,
      true
    )
    const parsed = JSON.parse(raw)
    return {
      score:   Math.min(100, Math.max(0, parsed.score ?? 50)),
      critique: parsed.critique ?? '',
      fixes:   parsed.fixes ?? [],
    }
  }, async () => ({ score: 70, critique: 'Agent unavailable — default score applied', fixes: [] }))
}

export async function POST(req: NextRequest) {
  const payload: ReviewPayload = await req.json()
  const { videoId, script, scenes, captions, hashtags, cta, hook, round = 1 } = payload

  const db = createServiceClient()

  // Load style profile + design system for agents to reference
  const [{ data: profile }, { data: designSystem }] = await Promise.all([
    db.from('style_profiles').select('*').order('updated_at', { ascending: false }).limit(1).single(),
    db.from('design_system').select('*').order('updated_at', { ascending: false }).limit(1).single(),
  ])

  const contentSummary = JSON.stringify({
    hook, script, scenes: scenes?.map(s => ({ caption: s.caption, duration: s.duration })),
    captions, hashtags, cta,
  }, null, 2)

  // Run all 6 agents in parallel
  const [viral, design, ux, brand, strategy, compliance] = await Promise.all([

    runAgent('viral-potential-agent',
      `You are a viral content analyst. Score this short-form video content for viral potential (0-100).
      Evaluate: hook strength, curiosity gap in first 3 seconds, emotional triggers (FOMO/surprise/aspiration),
      trend alignment, share-worthiness, watch-time retention.
      Respond JSON: { "score": 0-100, "critique": "2-3 sentence assessment", "fixes": ["specific fix 1", "specific fix 2"] }`,
      contentSummary),

    runAgent('design-quality-agent',
      `You are a senior visual designer. Score this content for design quality (0-100).
      Design system reference: ${JSON.stringify(designSystem?.colors ?? {})} colors, ${JSON.stringify(designSystem?.typography ?? {})} typography.
      Evaluate: visual consistency with brand colors, typography readability, text overlay contrast (min ${designSystem?.contrast_min ?? 4.5}:1),
      composition quality, thumbnail appeal.
      Respond JSON: { "score": 0-100, "critique": "2-3 sentence assessment", "fixes": ["specific fix 1", "specific fix 2"] }`,
      contentSummary),

    runAgent('ux-ui-agent',
      `You are a UX lead. Score this short-form video for UX quality (0-100).
      Platform rules: ${JSON.stringify(designSystem?.ux_rules ?? {})}.
      Evaluate: CTA placement (must appear before 60% of video), caption sync timing,
      scene pacing (1.5-5 sec per scene), mobile readability, thumbnail as static image.
      Respond JSON: { "score": 0-100, "critique": "2-3 sentence assessment", "fixes": ["specific fix 1", "specific fix 2"] }`,
      contentSummary),

    runAgent('brand-voice-agent',
      `You are a brand manager. Score this content for brand voice alignment (0-100).
      Brand profile: tone="${profile?.tone ?? 'confident, bold, conversational'}",
      hooks=${JSON.stringify(profile?.hook_patterns ?? [])}, niche="${profile?.niche ?? 'tech/SaaS'}".
      Evaluate: tone consistency, hook pattern match, vocabulary alignment, CTA clarity and funnel fit.
      Respond JSON: { "score": 0-100, "critique": "2-3 sentence assessment", "fixes": ["specific fix 1", "specific fix 2"] }`,
      contentSummary),

    runAgent('content-strategy-agent',
      `You are a content strategist. Score this content for strategic effectiveness (0-100).
      Strategy: ${profile?.hashtag_strategy ?? '3 niche + 2 trending + 1 brand'}, caption format: ${profile?.caption_format ?? 'short punchy + CTA'}.
      Evaluate: hashtag mix quality, niche alignment, posting uniqueness (not redundant),
      growth angle (saves/shares potential), funnel stage clarity.
      Respond JSON: { "score": 0-100, "critique": "2-3 sentence assessment", "fixes": ["specific fix 1", "specific fix 2"] }`,
      contentSummary),

    runAgent('platform-compliance-agent',
      `You are a platform compliance QA engineer. Score this content for platform compliance (0-100).
      Platform specs: ${JSON.stringify(designSystem?.platform_presets ?? {})}.
      Evaluate: whether content meets duration limits, caption character limits per platform,
      hashtag count limits, audio level standards (-14 LUFS), community guideline risk.
      Respond JSON: { "score": 0-100, "critique": "2-3 sentence assessment", "fixes": ["specific fix 1", "specific fix 2"] }`,
      contentSummary),
  ])

  // Weighted composite score
  const composite = Math.round(
    viral.score    * 0.30 +
    design.score   * 0.20 +
    ux.score       * 0.15 +
    brand.score    * 0.20 +
    strategy.score * 0.15 +
    compliance.score * 0.00  // compliance is pass/fail gating, not weighted
  )

  const compliancePassed = compliance.score >= 60

  let decision: 'approve' | 'revise' | 'regenerate'
  if (!compliancePassed) {
    decision = 'revise'
  } else if (composite >= 80) {
    decision = 'approve'
  } else if (composite >= 60 && round < 3) {
    decision = 'revise'
  } else {
    decision = 'regenerate'
  }

  const allFixes = [
    ...viral.fixes, ...design.fixes, ...ux.fixes,
    ...brand.fixes, ...strategy.fixes, ...compliance.fixes,
  ].filter(Boolean)

  const masterNotes = await chat(
    `You are the Master Review Agent. Synthesize agent feedback into a clear revision brief.
     Be specific and actionable. 2-4 sentences max.`,
    `Decision: ${decision}. Composite: ${composite}/100.
     Viral: ${viral.score} — ${viral.critique}
     Design: ${design.score} — ${design.critique}
     UX: ${ux.score} — ${ux.critique}
     Brand: ${brand.score} — ${brand.critique}
     Strategy: ${strategy.score} — ${strategy.critique}
     Compliance: ${compliance.score} — ${compliance.critique}`
  )

  // Persist all reviews to DB
  if (videoId) {
    const agentRows = [
      { video_id: videoId, agent_name: 'viral-potential',     score: viral.score,      critique: viral.critique,      round },
      { video_id: videoId, agent_name: 'design-quality',      score: design.score,     critique: design.critique,     round },
      { video_id: videoId, agent_name: 'ux-ui',               score: ux.score,         critique: ux.critique,         round },
      { video_id: videoId, agent_name: 'brand-voice',         score: brand.score,      critique: brand.critique,      round },
      { video_id: videoId, agent_name: 'content-strategy',    score: strategy.score,   critique: strategy.critique,   round },
      { video_id: videoId, agent_name: 'platform-compliance', score: compliance.score, critique: compliance.critique, round },
    ]
    await db.from('agent_reviews').insert(agentRows)
    await db.from('master_decisions').insert({
      video_id: videoId, composite_score: composite, decision, notes: masterNotes, round,
    })
    await db.from('videos').update({ status: `review:${decision}`, review_round: round }).eq('id', videoId)
  }

  return NextResponse.json({
    decision,
    composite,
    agentScores: { viral: viral.score, design: design.score, ux: ux.score, brand: brand.score, strategy: strategy.score, compliance: compliance.score },
    agentCritiques: { viral: viral.critique, design: design.critique, ux: ux.critique, brand: brand.critique, strategy: strategy.critique, compliance: compliance.critique },
    fixes: allFixes,
    masterNotes,
    round,
  })
}
