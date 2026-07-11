import { NextRequest, NextResponse } from 'next/server'
import { chat } from '@/lib/groq'
import { withResilience } from '@/lib/errors'
import { generateThumbnail } from '@/lib/skills/thumbnail-generator'

export const maxDuration = 60

const PLATFORM_SPECS: Record<string, string> = {
  youtube:   'YouTube Shorts — title max 100 chars CTR-optimized, description 2-3 sentences with keywords, 3-5 hashtags',
  tiktok:    'TikTok — no separate title, caption is hook-first max 150 chars, 4-6 hashtags mixing niche + trending',
  instagram: 'Instagram Reels — caption with hook line then value then CTA, line breaks, 5-8 hashtags',
  twitter:   'X/Twitter — single punchy post under 250 chars including 1-2 hashtags, strong opinion or surprising fact',
  linkedin:  'LinkedIn — professional title, story-driven description 100-150 words with a lesson, 3 hashtags',
  facebook:  'Facebook Reels — conversational shareable caption 1-2 sentences, 2-3 hashtags',
}

export interface PlatformPackage {
  platform: string
  title: string
  description: string
  caption: string
  hashtags: string[]
}

export async function POST(req: NextRequest) {
  try {
    const { topic, voiceover, hook, hashtags, platforms } = await req.json()
    if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 })

    const targets: string[] = (platforms?.length ? platforms : ['youtube', 'tiktok', 'instagram'])
      .map((p: string) => p.toLowerCase())
      .filter((p: string) => PLATFORM_SPECS[p])

    const packages = await withResilience(
      'package-platforms',
      async () => {
        const raw = await chat(
          `You are a social media publishing specialist. Package one video for multiple platforms.
          Platform requirements:
          ${targets.map(p => `- ${p}: ${PLATFORM_SPECS[p]}`).join('\n')}

          Respond in JSON: { "packages": [{ "platform": string, "title": string, "description": string, "caption": string, "hashtags": [string] }] }
          One entry per platform, in the order given. Titles must be scroll-stopping, never clickbait-dishonest.`,
          `Video topic: "${topic}"\nHook: "${hook ?? ''}"\nScript: "${(voiceover ?? '').slice(0, 900)}"\nBase hashtags: ${(hashtags ?? []).join(' ')}`,
          true
        )
        const parsed = JSON.parse(raw) as { packages: PlatformPackage[] }
        if (!parsed.packages?.length) throw new Error('empty packages')
        return parsed.packages
      },
      async () =>
        targets.map(platform => ({
          platform,
          title: topic.slice(0, 90),
          description: hook ?? topic,
          caption: `${hook ?? topic} ${(hashtags ?? []).slice(0, 4).join(' ')}`.trim(),
          hashtags: hashtags ?? [],
        }))
    )

    let thumbnailUrl = ''
    try {
      thumbnailUrl = await generateThumbnail(topic, 'bold high-contrast social media thumbnail')
    } catch {
      thumbnailUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
        `${topic}, eye-catching thumbnail, vibrant colors, bold composition`
      )}?width=1280&height=720&nologo=true`
    }

    return NextResponse.json({ packages, thumbnailUrl })
  } catch (err) {
    console.error('[package]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
