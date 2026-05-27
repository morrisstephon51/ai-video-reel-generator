import { NextResponse } from 'next/server'
import { chat } from '@/lib/groq'
import { withResilience } from '@/lib/errors'
import { createServiceClient } from '@/lib/supabase/server'

interface Trend {
  topic: string
  score: number
  reason: string
}

export async function POST() {
  const result = await withResilience('trend-intelligence', async () => {
    // Fetch Google Trends RSS
    const rssRes = await fetch('https://trends.google.com/trends/trendingsearches/daily/rss?geo=US', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const xml = await rssRes.text()

    // Parse trending topics from XML using simple string parsing
    const topics: string[] = []
    const titleRegex = /<item>[\s\S]*?<title><!\[CDATA\[([^\]]+)\]\]><\/title>/g
    let match
    while ((match = titleRegex.exec(xml)) !== null && topics.length < 20) {
      topics.push(match[1])
    }
    // Fallback: try plain <title> tags after the first (channel title)
    if (topics.length === 0) {
      const plainRegex = /<title>(?:<!\[CDATA\[)?([^\]<]+)(?:\]\]>)?<\/title>/g
      let first = true
      while ((match = plainRegex.exec(xml)) !== null && topics.length < 20) {
        if (first) { first = false; continue } // skip channel title
        topics.push(match[1].trim())
      }
    }

    // Load style profile for niche context
    const db = createServiceClient()
    const { data: profile } = await db
      .from('style_profiles')
      .select('niche, tone')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    const niche = profile?.niche ?? 'tech/SaaS'

    const raw = await chat(
      `You are a trend analyst for a ${niche} content creator. Score each trending topic 0-100 for relevance to the niche.
      Respond in JSON: { "trends": [{ "topic": string, "score": number, "reason": string }] }`,
      `Score these trending topics for relevance to the ${niche} niche:\n${topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
      true
    )

    const parsed = JSON.parse(raw) as { trends: Trend[] }
    const trends: Trend[] = (parsed.trends ?? []).sort((a, b) => b.score - a.score)

    return { trends }
  })

  return NextResponse.json(result)
}
