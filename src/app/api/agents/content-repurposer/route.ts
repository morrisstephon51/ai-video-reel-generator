import { NextRequest, NextResponse } from 'next/server'
import { chat } from '@/lib/groq'
import { withResilience } from '@/lib/errors'

const PLATFORM_NORMS: Record<string, string> = {
  tiktok:    'fast-paced, hook in 1s, casual Gen-Z tone, 15-60 seconds, trending sounds reference',
  instagram: 'visual-first, lifestyle tone, 30-90 seconds for Reels, polished but authentic',
  youtube:   'longer-form, educational depth, 5-15 minutes, chapters, detailed explanations',
  twitter:   'punchy, 280 char limit for text, witty, no fluff, strong opinion or fact',
  linkedin:  'professional insight, value-driven, story with a lesson, career/business focus',
  facebook:  'conversational, community-focused, shareable, slightly longer than Twitter',
}

export async function POST(req: NextRequest) {
  const { script, topic, original_platform } = await req.json()
  if (!script) return NextResponse.json({ error: 'script required' }, { status: 400 })

  const result = await withResilience('content-repurposer', async () => {
    const raw = await chat(
      `You are a content repurposing specialist. Rewrite this ${original_platform ?? 'video'} script for all 6 platforms.
      Each version must match the platform's tone, length, and content norms.
      Platform norms: ${JSON.stringify(PLATFORM_NORMS)}
      Topic context: ${topic ?? ''}
      Respond in JSON: {
        "repurposed": {
          "tiktok": string,
          "instagram": string,
          "youtube": string,
          "twitter": string,
          "linkedin": string,
          "facebook": string
        }
      }`,
      `Original script: ${script}`,
      true
    )

    const parsed = JSON.parse(raw) as { repurposed: Record<string, string> }
    return { repurposed: parsed.repurposed ?? {} }
  })

  return NextResponse.json(result)
}
