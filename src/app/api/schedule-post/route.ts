import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { scheduledFor, topic, videoId } = await req.json()
    if (!scheduledFor) return NextResponse.json({ error: 'scheduledFor required' }, { status: 400 })

    const db = createServiceClient()
    const { error } = await db.from('content_queue').insert({
      video_id:     videoId ?? null,
      platform:     'manual',
      title:        topic ?? 'Untitled',
      scheduled_at: scheduledFor,
      status:       'queued',
    })
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true, scheduledFor })
  } catch (err) {
    console.error('[schedule-post]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
