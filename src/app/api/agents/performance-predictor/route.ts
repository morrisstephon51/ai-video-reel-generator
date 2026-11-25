import { NextRequest, NextResponse } from 'next/server'
import { chat } from '@/lib/groq'
import { withResilience } from '@/lib/errors'
import { coerceCount, coerceScore } from '@/lib/llm-coerce'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const { script, hook, captions, hashtags, platform } = await req.json()
  if (!script) return NextResponse.json({ error: 'script required' }, { status: 400 })

  const result = await withResilience('performance-predictor', async () => {
    const raw = await chat(
      `You are a social media performance analyst. Predict engagement metrics for this content based on content quality signals.
      Platform: ${platform ?? 'instagram'}
      Analyze: hook strength, caption quality, hashtag relevance, script engagement, CTA clarity.
      Respond in JSON: {
        "predicted_views": number,
        "predicted_likes": number,
        "predicted_shares": number,
        "viral_probability": number,
        "confidence": number
      }
      viral_probability is 0-100. confidence is 0-100 reflecting how certain the prediction is.
      Base predictions on realistic ranges for an account with ~1000-10000 followers.`,
      `Script: ${typeof script === 'string' ? script.slice(0, 400) : ''}
      Hook: ${hook ?? ''}
      Captions: ${JSON.stringify(captions ?? [])}
      Hashtags: ${JSON.stringify(hashtags ?? [])}`,
      true
    )

    const parsed = JSON.parse(raw) as {
      predicted_views: number
      predicted_likes: number
      predicted_shares: number
      viral_probability: number
      confidence: number
    }
    return {
      predicted_views:    coerceCount(parsed?.predicted_views, 0),
      predicted_likes:    coerceCount(parsed?.predicted_likes, 0),
      predicted_shares:   coerceCount(parsed?.predicted_shares, 0),
      viral_probability:  coerceScore(parsed?.viral_probability, 0),
      confidence:         coerceScore(parsed?.confidence, 50),
    }
  })

  return NextResponse.json(result)
}
