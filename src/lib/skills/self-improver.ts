import { chat } from '@/lib/groq'
import { createServiceClient } from '@/lib/supabase/server'

export interface ImprovementReport {
  improvements: string[]
  top_patterns: string[]
  avoid_patterns: string[]
  updated_profile: Record<string, unknown>
  reasoning: string
  posts_analyzed: number
}

interface PostAnalytics {
  views: number
  likes: number
  shares: number
  comments: number
  platform: string
  engagement_rate: number
  created_at: string
}

export async function runSelfImprovementCycle(): Promise<ImprovementReport> {
  const db = createServiceClient()

  // Read last 20 posts from post_analytics
  const { data: analyticsData } = await db
    .from('post_analytics')
    .select('views, likes, shares, comments, platform, engagement_rate, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  const analytics = (analyticsData ?? []) as PostAnalytics[]

  // Load current style profile
  const { data: profileData } = await db
    .from('style_profiles')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  const currentProfile = profileData ?? {}

  if (!analytics.length) {
    return {
      improvements: ['Insufficient data — need at least 1 post with analytics.'],
      top_patterns: [],
      avoid_patterns: [],
      updated_profile: currentProfile as Record<string, unknown>,
      reasoning: 'No analytics data available yet.',
      posts_analyzed: 0,
    }
  }

  // Sort to identify top and bottom performers
  const sorted = [...analytics].sort(
    (a, b) => (b.views + b.likes * 3 + b.shares * 5) - (a.views + a.likes * 3 + a.shares * 5)
  )
  const top = sorted.slice(0, Math.ceil(sorted.length / 2))
  const bottom = sorted.slice(Math.ceil(sorted.length / 2))

  const raw = await chat(
    `You are a content performance analyst and AI self-improvement engine.
    Analyze top vs bottom performing posts to extract actionable patterns.
    Current style profile: ${JSON.stringify(currentProfile)}
    Respond in JSON: {
      "improvements": [string],
      "top_patterns": [string],
      "avoid_patterns": [string],
      "updated_profile": { "tone": string, "hook_style": string, "pacing": string, "niche": string },
      "reasoning": string
    }`,
    `Top performers (${top.length} posts): ${JSON.stringify(top)}
    Bottom performers (${bottom.length} posts): ${JSON.stringify(bottom)}`,
    true
  )

  const parsed = JSON.parse(raw) as {
    improvements: string[]
    top_patterns: string[]
    avoid_patterns: string[]
    updated_profile: Record<string, unknown>
    reasoning: string
  }

  // Update style_profiles table with recommendations
  if (parsed.updated_profile && Object.keys(parsed.updated_profile).length) {
    await db.from('style_profiles').upsert({
      ...currentProfile,
      ...parsed.updated_profile,
      updated_at: new Date().toISOString(),
    })
  }

  return {
    improvements:    parsed.improvements ?? [],
    top_patterns:    parsed.top_patterns ?? [],
    avoid_patterns:  parsed.avoid_patterns ?? [],
    updated_profile: parsed.updated_profile ?? {},
    reasoning:       parsed.reasoning ?? '',
    posts_analyzed:  analytics.length,
  }
}
