import { NextRequest, NextResponse } from 'next/server'
import { chat } from '@/lib/groq'
import { withResilience } from '@/lib/errors'
import { createServiceClient } from '@/lib/supabase/server'

export const maxDuration = 30

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
  hook_patterns?: string[] | string
  pacing?: string
  [key: string]: unknown
}

/**
 * Map the model's profile update onto the real `style_profiles` columns before
 * it reaches Supabase. The table stores hooks in a `hook_patterns` jsonb array
 * (src/lib/db/schema.sql), but this analysis prompt has historically asked the
 * model for a `hook_style` string. Upserting a `hook_style` key fails the whole
 * write (PGRST204 - column not in schema cache, same class as issue #41), so
 * the self-improvement loop silently never persisted its learned profile - and
 * PR #39's id fix can't take effect while the write still errors. Translate the
 * hook field to `hook_patterns` and never let a phantom `hook_style` key through.
 */
export function toUpsertProfile(updated: StyleProfile): StyleProfile {
  const out: StyleProfile = {}
  for (const [k, v] of Object.entries(updated)) {
    if (k === 'hook_style' || k === 'hook_patterns') continue
    out[k] = v
  }
  const rawHooks = updated.hook_patterns ?? updated.hook_style
  if (rawHooks !== undefined) {
    out.hook_patterns = Array.isArray(rawHooks)
      ? rawHooks.map((h) => String(h).slice(0, 300)).slice(0, 12)
      : String(rawHooks)
          .split('\n')
          .map((h) => h.trim().slice(0, 300))
          .filter(Boolean)
          .slice(0, 12)
  }
  return out
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

    // Load current style profile if not provided — always fetch so we have the id for upsert
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
          "hook_patterns": [string],
          "pacing": string
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

    // Update style_profiles table — spread currentProfile first so the existing id
    // is included; without it upsert inserts a new row instead of updating in place.
    if (parsed.updated_profile && Object.keys(parsed.updated_profile).length) {
      await db.from('style_profiles').upsert({
        ...currentProfile,
        ...toUpsertProfile(parsed.updated_profile),
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
