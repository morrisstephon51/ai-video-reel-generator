import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getBestPostTimes } from '@/lib/skills/schedule-optimizer'

const DAY_INDEX: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
}

const VALID_PLATFORMS = new Set(['youtube', 'tiktok', 'instagram', 'twitter', 'linkedin', 'facebook'])

function nextSlot(platform: string, notBefore: Date): Date {
  const slots = getBestPostTimes(platform)
  let best: Date | null = null
  for (const slot of slots) {
    const [hh, mm] = slot.time.split(':').map(Number)
    const candidate = new Date(notBefore)
    const targetDay = DAY_INDEX[slot.day] ?? 5
    const delta = (targetDay - candidate.getDay() + 7) % 7
    candidate.setDate(candidate.getDate() + delta)
    candidate.setHours(hh, mm, 0, 0)
    if (candidate <= notBefore) candidate.setDate(candidate.getDate() + 7)
    if (!best || candidate < best) best = candidate
  }
  return best ?? new Date(notBefore.getTime() + 24 * 3600 * 1000)
}

export async function GET() {
  try {
    const db = createServiceClient()
    const { data, error } = await db
      .from('content_queue')
      .select('*')
      .order('scheduled_at', { ascending: true })
      .limit(50)
    if (error) throw new Error(error.message)
    return NextResponse.json({ queue: data ?? [] })
  } catch (err) {
    return NextResponse.json({ queue: [], error: (err as Error).message })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { videoId, videoUrl, thumbnailUrl, packages, scheduledAt } = await req.json()
    if (!packages?.length) return NextResponse.json({ error: 'packages required' }, { status: 400 })

    const now = new Date()
    const rows = packages
      .filter((pkg: { platform: string }) => VALID_PLATFORMS.has(pkg.platform?.toLowerCase()))
      .map((pkg: {
        platform: string; title: string; description?: string; caption?: string; hashtags?: string[]
      }) => ({
        video_id: videoId ?? null,
        platform: pkg.platform.toLowerCase(),
        title: pkg.title,
        description: pkg.description ?? null,
        caption: pkg.caption ?? null,
        hashtags: pkg.hashtags ?? [],
        thumbnail_url: thumbnailUrl ?? null,
        video_url: videoUrl ?? null,
        scheduled_at: scheduledAt ?? nextSlot(pkg.platform.toLowerCase(), now).toISOString(),
        status: 'queued',
      }))

    if (!rows.length) return NextResponse.json({ error: 'no valid platforms' }, { status: 400 })

    const db = createServiceClient()
    const { data, error } = await db.from('content_queue').insert(rows).select('id, platform, scheduled_at')
    if (error) throw new Error(error.message)

    return NextResponse.json({ scheduled: data })
  } catch (err) {
    console.error('[schedule]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
