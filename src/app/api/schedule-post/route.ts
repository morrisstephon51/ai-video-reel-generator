import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { scheduledFor, topic, videoId } = await req.json()
    if (!scheduledFor) return NextResponse.json({ error: 'scheduledFor required' }, { status: 400 })

    const db = createServiceClient()
    await db.from('scheduled_posts').insert({
      video_id:      videoId ?? null,
      topic:         topic ?? null,
      scheduled_for: scheduledFor,
      status:        'pending',
    })

    return NextResponse.json({ ok: true, scheduledFor })
  } catch (err) {
    console.error('[schedule-post]', err)
    return NextResponse.json({ ok: true, scheduledFor: req.body })
  }
}
