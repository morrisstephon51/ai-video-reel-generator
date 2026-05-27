import { NextRequest, NextResponse } from 'next/server'
import { chat } from '@/lib/groq'
import { withResilience } from '@/lib/errors'

interface HashtagEntry {
  tag: string
  reach_score: number
  competition_score: number
  balance_score: number
}

export async function POST(req: NextRequest) {
  const { topic, niche, platform } = await req.json()
  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 })

  const result = await withResilience('hashtag-research', async () => {
    const raw = await chat(
      `You are a hashtag research specialist. Generate 30 hashtags in 3 tiers for the given topic.
      Niche tier (10): specific, low-competition, high-intent tags
      Mid tier (10): moderate reach, reasonable competition
      Broad tier (10): high-reach, high-competition tags for discovery
      Platform: ${platform ?? 'instagram'}
      Score each hashtag for reach (0-100) vs competition (0-100) and compute balance_score = reach - competition*0.5.
      Also pick the top 10 recommended hashtags across all tiers.
      Respond in JSON: {
        "hashtags": {
          "niche": [{ "tag": string, "reach_score": number, "competition_score": number, "balance_score": number }],
          "mid":   [{ "tag": string, "reach_score": number, "competition_score": number, "balance_score": number }],
          "broad": [{ "tag": string, "reach_score": number, "competition_score": number, "balance_score": number }],
          "recommended": [string]
        }
      }`,
      `Topic: ${topic}\nNiche: ${niche ?? 'general'}\nPlatform: ${platform ?? 'instagram'}`,
      true
    )

    const parsed = JSON.parse(raw) as {
      hashtags: {
        niche: HashtagEntry[]
        mid: HashtagEntry[]
        broad: HashtagEntry[]
        recommended: string[]
      }
    }
    return { hashtags: parsed.hashtags ?? { niche: [], mid: [], broad: [], recommended: [] } }
  })

  return NextResponse.json(result)
}
