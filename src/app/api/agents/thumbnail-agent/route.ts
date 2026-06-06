import { NextRequest, NextResponse } from 'next/server'
import { chat } from '@/lib/groq'
import { withResilience } from '@/lib/errors'

interface Thumbnail {
  prompt: string
  imageUrl: string
  ctr_score: number
}

export async function POST(req: NextRequest) {
  const { topic, script, style_profile } = await req.json()
  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 })

  const result = await withResilience('thumbnail-agent', async () => {
    const raw = await chat(
      `You are a thumbnail strategist. Generate 3 thumbnail concepts optimized for CTR.
      Each should have a different visual angle (emotion, text-heavy, curiosity gap).
      Style context: ${JSON.stringify(style_profile ?? {})}
      Script excerpt: ${typeof script === 'string' ? script.slice(0, 300) : ''}
      Respond in JSON: { "thumbnails": [{ "prompt": string, "ctr_score": number }] }
      The prompt should be a detailed image generation prompt suitable for Pollinations.ai.`,
      `Topic: ${topic}`,
      true
    )
    const parsed = JSON.parse(raw) as { thumbnails: Array<{ prompt: string; ctr_score: number }> }
    const concepts = parsed.thumbnails ?? []

    const thumbnails: Thumbnail[] = concepts.slice(0, 3).map((t) => {
      const encoded = encodeURIComponent(t.prompt.slice(0, 500))
      return {
        prompt: t.prompt,
        imageUrl: `https://image.pollinations.ai/prompt/${encoded}?width=1280&height=720&nologo=true`,
        ctr_score: Math.min(100, Math.max(0, t.ctr_score ?? 70)),
      }
    })

    return { thumbnails }
  })

  return NextResponse.json(result)
}
