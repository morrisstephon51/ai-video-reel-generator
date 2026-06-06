import { NextRequest, NextResponse } from 'next/server'
import { chat } from '@/lib/groq'
import { withResilience } from '@/lib/errors'

interface Variant {
  label: string
  hook: string
  script: string
  predicted_advantage: string
}

export async function POST(req: NextRequest) {
  const { original_prompt, script } = await req.json()
  if (!original_prompt) return NextResponse.json({ error: 'original_prompt required' }, { status: 400 })

  const result = await withResilience('ab-tester', async () => {
    const raw = await chat(
      `You are an A/B testing specialist for short-form video content.
      Create 2 alternate script versions with different angles from the original.
      Each variant should have a distinct hook style and narrative approach.
      Original script reference: ${typeof script === 'string' ? script.slice(0, 400) : 'not provided'}
      Respond in JSON: {
        "variants": [
          { "label": "Variant A", "hook": string, "script": string, "predicted_advantage": string },
          { "label": "Variant B", "hook": string, "script": string, "predicted_advantage": string }
        ]
      }
      Each script should be 100-150 words. The predicted_advantage explains why this angle might outperform the original.`,
      `Original prompt: ${original_prompt}`,
      true
    )

    const parsed = JSON.parse(raw) as { variants: Variant[] }
    return { variants: parsed.variants ?? [] }
  })

  return NextResponse.json(result)
}
