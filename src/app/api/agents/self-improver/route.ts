import { NextRequest, NextResponse } from 'next/server'
import { chat } from '@/lib/groq'
import { withResilience } from '@/lib/errors'
import { createServiceClient } from '@/lib/supabase/server'

interface AnalyticsRow {
  views: number
  likes: number
  shares: number
  comments: number
  platform: string
  created_at: string
}

interface StyleProfile {
  niche?: string
  tone?: string
  hook_style?: string
  pacing?: string
  [key: string]: unknown
}

export async function POST(req: NextRequest) {
  const { recent_analytics, style_profile } = await req.json()

  const result = await withResilience('self-improver', async () => {
    const db = createServiceClient()

    // Load analytics from DB if not provided
    let analytics: AnalyticsRow[] = recent_analytics ?? []
    if (!analytics.length) {
      const { data } = await db
        .from('post_analytics')
        .select('views, likes, shares, comments, platform, created_at')
        .order('created_at', { ascending: false })
        .limit(20)
      analytics = (data ?? []) as AnalyticsRow[]
    }

    // Load current style profile if not provided
    let currentProfile: StyleProfile = style_profile ?? {}
    if (!Object.keys(currentProfile).length) {
      const { data: profileData } = await db
        .from('style_profiles')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()
      currentProfile = (profileData as StyleProfile) ?? {}
    }

    const raw = await chat(
      `You are a content performance analyst and AI self-improvement engine.
      Analyze the recent analytics data to identify:
      1. Top performing content patterns (high views, likes, shares)
      2. Underperforming content patterns
      3. Platform-specific insights
      4. Recommended style profile updates
      Current style profile: ${JSON.stringify(currentProfile)}
      Respond in JSON: {
        "improvements": [string],
        "updated_profile": {
          "niche": string,
          "tone": string,
          "hook_style": string,
          "pacing": string,
          "top_performing_patterns": [string],
          "avoid_patterns": [string]
        },
        "reasoning": string
      }`,
      `Recent analytics (last 20 posts): ${JSON.stringify(analytics)}`,
      true
    )

    const parsed = JSON.parse(raw) as {
      improvements: string[]
      updated_profile: StyleProfile
      reasoning: string
    }

    // Update style_profiles table
    if (parsed.updated_profile && Object.keys(parsed.updated_profile).length) {
      await db.from('style_profiles').upsert({
        ...parsed.updated_profile,
        updated_at: new Date().toISOString(),
      })
    }

    return {
      improvements: parsed.improvements ?? [],
      updated_profile: parsed.updated_profile ?? {},
      reasoning: parsed.reasoning ?? '',
    }
  })

  return NextResponse.json(result)
}
