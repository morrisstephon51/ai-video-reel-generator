import { NextRequest, NextResponse } from 'next/server'
import { chat } from '@/lib/groq'
import { withResilience } from '@/lib/errors'

interface Hook {
  text: string
  score: number
  type: 'question' | 'bold_claim' | 'story' | 'statistic' | 'controversy'
}

export async function POST(req: NextRequest) {
  const { topic, style_profile } = await req.json()
  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 })

  const result = await withResilience('hook-optimizer', async () => {
    // Generate 5 hook variations
    const raw = await chat(
      `You are a short-form video hook specialist. Generate 5 hook variations for the given topic, one of each type.
      Each hook must stop the scroll in the first 3 seconds.
      Style context: ${JSON.stringify(style_profile ?? {})}
      Respond in JSON: { "hooks": [{ "text": string, "type": "question|bold_claim|story|statistic|controversy" }] }`,
      `Topic: ${topic}`,
      true
    )
    const parsed = JSON.parse(raw) as { hooks: Array<{ text: string; type: string }> }
    const hooks = parsed.hooks ?? []

    // Score each hook
    const scored: Hook[] = await Promise.all(
      hooks.map(async (h) => {
        const scoreRaw = await chat(
          `You are a viral content scorer. Score this hook 0-100 for scroll-stopping power.
          Respond in JSON: { "score": number }`,
          `Hook: "${h.text}"`,
          true
        )
        const { score } = JSON.parse(scoreRaw) as { score: number }
        return {
          text: h.text,
          score: Math.min(100, Math.max(0, score ?? 50)),
          type: h.type as Hook['type'],
        }
      })
    )

    scored.sort((a, b) => b.score - a.score)
    const best_hook = scored[0]?.text ?? ''

    return { hooks: scored, best_hook }
  })

  return NextResponse.json(result)
}
