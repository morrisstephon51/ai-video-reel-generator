import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getBestPostTimes } from '@/lib/skills/schedule-optimizer'

const DAY_INDEX: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
}

const VALID_PLATFORMS = new Set(['youtube', 'tiktok', 'instagram', 'twitter', 'linkedin', 'facebook'])

// The engagement-research "best post times" in schedule-optimizer are audience-local
// clock times (US-centric). We anchor them to a fixed reference zone so a slot like
// "Friday 18:00" always resolves to 6pm Eastern — NOT 6pm in whatever timezone the
// server happens to run in. Previously nextSlot used Date.setHours/getDay, which read
// the server-local zone: on Vercel (UTC) every post was scheduled 4-5h early, and the
// same deploy produced different times in local dev vs prod. Per-audience timezones
// remain future work; a documented reference zone is the correct deterministic default.
const REFERENCE_TZ = 'America/New_York'
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

// Offset (ms) of `timeZone` from UTC at a given instant. Positive = zone ahead of UTC.
function tzOffsetMs(instant: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const p: Record<string, string> = {}
  for (const part of dtf.formatToParts(new Date(instant))) p[part.type] = part.value
  const asIfUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return asIfUtc - instant
}

// Convert a wall-clock time *in `timeZone`* to the matching absolute UTC instant (DST-correct).
function zonedWallClockToUtc(y: number, mo: number, d: number, hh: number, mm: number, timeZone: string): Date {
  const guess = Date.UTC(y, mo, d, hh, mm, 0)
  return new Date(guess - tzOffsetMs(guess, timeZone))
}

// Calendar Y/M/D + weekday of `instant` as seen in `timeZone`.
function zonedParts(instant: number, timeZone: string): { year: number; month: number; day: number; weekday: number } {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
  })
  const p: Record<string, string> = {}
  for (const part of dtf.formatToParts(new Date(instant))) p[part.type] = part.value
  return { year: +p.year, month: +p.month - 1, day: +p.day, weekday: WEEKDAY_INDEX[p.weekday] ?? 0 }
}

function nextSlot(platform: string, notBefore: Date): Date {
  const slots = getBestPostTimes(platform)
  const ref = zonedParts(notBefore.getTime(), REFERENCE_TZ)
  let best: Date | null = null
  for (const slot of slots) {
    const [hh, mm] = slot.time.split(':').map(Number)
    const targetDay = DAY_INDEX[slot.day] ?? 5
    const delta = (targetDay - ref.weekday + 7) % 7
    // Resolve the slot's reference-zone wall clock to an absolute instant. Calendar
    // arithmetic is done in UTC (a pure day counter), then reinterpreted in REFERENCE_TZ.
    const at = (addDays: number): Date => {
      const cal = new Date(Date.UTC(ref.year, ref.month, ref.day + addDays))
      return zonedWallClockToUtc(cal.getUTCFullYear(), cal.getUTCMonth(), cal.getUTCDate(), hh, mm, REFERENCE_TZ)
    }
    let candidate = at(delta)
    if (candidate <= notBefore) candidate = at(delta + 7)
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
