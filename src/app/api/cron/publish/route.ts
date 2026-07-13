import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { publishToPlatform, QueueItem } from '@/lib/connectors'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

async function processQueue() {
  const db = createServiceClient()
  const { data: due, error } = await db
    .from('content_queue')
    .select('*')
    .eq('status', 'queued')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(5)
  if (error) throw new Error(error.message)

  const results = []
  for (const item of (due ?? []) as (QueueItem & { scheduled_at: string })[]) {
    // Atomically claim the item before publishing. The `.eq('status', 'queued')`
    // guard means only one worker's UPDATE can match — a second overlapping run
    // (e.g. the Vercel cron GET racing a manual POST) gets zero rows back and
    // skips it. Without this, the same video could be uploaded to YouTube twice.
    const { data: claimed, error: claimErr } = await db
      .from('content_queue')
      .update({ status: 'publishing' })
      .eq('id', item.id)
      .eq('status', 'queued')
      .select('id')
    if (claimErr) throw new Error(claimErr.message)
    if (!claimed || claimed.length === 0) continue // already claimed by another run

    const result = await publishToPlatform(item)
    const update =
      result.outcome === 'posted' ? { status: 'posted', posted_at: new Date().toISOString(), platform_post_id: result.postId, last_error: null } :
      result.outcome === 'ready'  ? { status: 'ready', last_error: result.reason } :
                                    { status: 'failed', last_error: result.error }
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
