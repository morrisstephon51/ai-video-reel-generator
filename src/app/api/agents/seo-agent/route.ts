import { NextRequest, NextResponse } from 'next/server'
import { chat } from '@/lib/groq'
import { withResilience } from '@/lib/errors'

export async function POST(req: NextRequest) {
  const { topic, script, platform } = await req.json()
  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 })

  const result = await withResilience('seo-agent', async () => {
    const raw = await chat(
      `You are an SEO specialist for video content. Generate an SEO-optimized title, description, and tags for ${platform ?? 'YouTube'}.
      Rules:
      - Title: 60-70 characters, include primary keyword near the start
      - Description: 200-300 words, keyword-rich first sentence, natural language, include timestamps if applicable
      - Tags: 15-20 highly relevant tags, mix of short and long-tail
      - SEO score: 0-100 based on keyword density, title strength, description quality
      Respond in JSON: { "title": string, "description": string, "tags": [string], "seo_score": number }`,
      `Topic: ${topic}\nScript: ${typeof script === 'string' ? script.slice(0, 500) : ''}`,
      true
    )

    const parsed = JSON.parse(raw) as {
      title: string
      description: string
      tags: string[]
      seo_score: number
    }
    return {
      title: parsed.title ?? '',
      description: parsed.description ?? '',
      tags: parsed.tags ?? [],
      seo_score: Math.min(100, Math.max(0, parsed.seo_score ?? 70)),
    }
  })

  return NextResponse.json(result)
}
