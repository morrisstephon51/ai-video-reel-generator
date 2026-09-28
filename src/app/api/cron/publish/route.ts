import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { publishToPlatform } from '@/lib/connectors'
import { createSupabaseQueuePort, runQueue, type QueueClient } from '@/lib/queue-runner'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

// Claiming, reaping and the run budget all live in @/lib/queue-runner so they are
// testable without a database. This route only wires them to supabase.
async function processQueue() {
  const port = createSupabaseQueuePort(createServiceClient() as unknown as QueueClient)
  return runQueue(port, publishToPlatform)
}

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  return !secret || req.headers.get('authorization') === `Bearer ${secret}`
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const report = await processQueue()
    return NextResponse.json({
      processed: report.results.length,
      results: report.results,
      reaped: report.reaped,
      stoppedEarly: report.stoppedEarly,
    })
  } catch (err) {
    console.error('[cron/publish]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
