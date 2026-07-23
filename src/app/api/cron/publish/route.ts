import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { publishToPlatform, QueueItem } from '@/lib/connectors'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

async function processQueue() {
  const db = createServiceClient()

  // Atomically claim items before processing — prevents double-publish when
  // concurrent Vercel Cron invocations overlap (see issue #11).
  const { data: claimed, error } = await db.rpc('claim_queue_items', { limit_count: 5 })
  if (error) throw new Error(error.message)

  const results = []
  for (const item of (claimed ?? []) as (QueueItem & { scheduled_at: string })[]) {
    const result = await publishToPlatform(item)
    const update =
      result.outcome === 'posted' ? { status: 'posted', posted_at: new Date().toISOString(), platform_post_id: result.postId, last_error: null } :
      result.outcome === 'ready'  ? { status: 'ready',  last_error: result.reason } :
                                    { status: 'failed',  last_error: result.error }
    await db.from('content_queue').update(update).eq('id', item.id)
    results.push({ id: item.id, platform: item.platform, ...result })
  }
  return results
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const results = await processQueue()
    return NextResponse.json({ processed: results.length, results })
  } catch (err) {
    console.error('[cron/publish]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const results = await processQueue()
    return NextResponse.json({ processed: results.length, results })
  } catch (err) {
    console.error('[cron/publish]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
