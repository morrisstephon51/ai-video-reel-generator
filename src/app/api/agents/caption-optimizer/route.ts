import { NextRequest, NextResponse } from 'next/server'
import { chat } from '@/lib/groq'
import { withResilience } from '@/lib/errors'

const PLATFORM_LIMITS: Record<string, { chars: number; style: string }> = {
  tiktok:    { chars: 2200, style: 'casual, trendy, emoji-friendly, Gen-Z tone' },
  instagram: { chars: 2200, style: 'visual storytelling, lifestyle, hashtag-heavy' },
  youtube:   { chars: 5000, style: 'detailed, SEO-optimized, long-form friendly, keyword-rich' },
  twitter:   { chars: 280,  style: 'punchy, conversational, no hashtag spam, max 1-2 hashtags' },
  linkedin:  { chars: 3000, style: 'professional, insight-driven, value-first, career-oriented' },
  facebook:  { chars: 63206, style: 'conversational, community-driven, storytelling, shareable' },
}

export async function POST(req: NextRequest) {
  const { script, platform, cta, hashtags } = await req.json()
  if (!script) return NextResponse.json({ error: 'script required' }, { status: 400 })

  const result = await withResilience('caption-optimizer', async () => {
    const platformList = platform ? [platform] : Object.keys(PLATFORM_LIMITS)
    const raw = await chat(
      `You are a social media caption expert. Write platform-specific captions for each platform listed.
      Each caption must respect the platform's character limit and style norms.
      Platform specs: ${JSON.stringify(PLATFORM_LIMITS)}
      CTA: ${cta ?? 'Follow for more'}
      Hashtags to incorporate: ${JSON.stringify(hashtags ?? [])}
      Respond in JSON: { "captions": { "tiktok": string, "instagram": string, "youtube": string, "twitter": string, "linkedin": string, "facebook": string } }`,
      `Script: ${script}\nPlatforms to write for: ${platformList.join(', ')}`,
      true
    )

    const parsed = JSON.parse(raw) as { captions: Record<string, string> }
    return { captions: parsed.captions ?? {} }
  })

  return NextResponse.json(result)
}
