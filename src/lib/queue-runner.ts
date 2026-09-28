import type { PublishResult, QueueItem } from './connectors'

/** A `content_queue` row handed back by the `claim_queue_items` RPC. */
export type ClaimedItem = QueueItem & { scheduled_at: string; claimed_at?: string | null }

/**
 * `claim_queue_items` flips a row to `processing` in the database *before* the
 * publish attempt starts, and only `queued` rows are ever claimable. Nothing
 * moves a row back out of `processing`, so any invocation that dies between the
 * claim and the status write — a `maxDuration` timeout mid-upload is the common
 * one — strands that row forever: never retried, never posted, never failed.
 *
 * Two guards below, and they do different jobs:
 *
 *   1. Claim one row at a time (never a batch). A run that is killed can only
 *      ever strand the single row it was actually uploading; rows it had not
 *      reached yet are still `queued` and get picked up by the next run.
 *   2. Reap what rule 1 still allows. A row left in `processing` far longer than
 *      any function can live belongs to a dead run, so surface it as `failed`
 *      with a reason instead of letting it sit silent.
 */

/**
 * Stop *starting* new items once this much of the run is gone. The route caps
 * out at `maxDuration = 60`, so leaving headroom means we never begin an upload
 * the platform is about to kill.
 */
export const RUN_BUDGET_MS = 45_000

/**
 * How long a row may sit in `processing` before it is treated as abandoned.
 * Fifteen minutes is fifteen times the function ceiling, so a row this old
 * cannot still be in flight.
 */
export const STALE_CLAIM_MS = 15 * 60 * 1000

/** Upper bound on items published per invocation (unchanged from the batch claim). */
export const MAX_ITEMS_PER_RUN = 5

/**
 * Deliberately not `queued`. The run that claimed this row may have finished the
 * upload and died before recording it, so re-publishing risks a duplicate public
 * post. Say what is known, and leave the call to a human.
 */
export const STALE_CLAIM_ERROR =
  'Interrupted mid-publish (the run that claimed this post ended without finishing). ' +
  'It may or may not have reached the platform — check there first, then re-schedule if it did not.'

export interface QueuePort {
  /** Fail rows abandoned in `processing` before `cutoffIso`. Returns the reaped ids. */
  reapStaleClaims(cutoffIso: string): Promise<string[]>
  /** Claim exactly one due row, or `null` when nothing is due. */
  claimOne(): Promise<ClaimedItem | null>
  /** Write the terminal state of one item. */
  finish(id: string, update: Record<string, unknown>): Promise<void>
}

/** Maps a publish outcome onto the `content_queue` columns it should leave behind. */
export function outcomeUpdate(result: PublishResult, nowIso: string): Record<string, unknown> {
  if (result.outcome === 'posted') {
    return { status: 'posted', posted_at: nowIso, platform_post_id: result.postId, last_error: null }
  }
  if (result.outcome === 'ready') {
    return { status: 'ready', last_error: result.reason }
  }
  return { status: 'failed', last_error: result.error }
}

export interface RunQueueOptions {
  now?: () => number
  nowIso?: () => string
  budgetMs?: number
  maxItems?: number
  staleMs?: number
}

export interface RunQueueReport {
  reaped: string[]
  results: Array<{ id: string; platform: string } & PublishResult>
  stoppedEarly: boolean
}

export async function runQueue(
  port: QueuePort,
  publish: (item: ClaimedItem) => Promise<PublishResult>,
  options: RunQueueOptions = {},
): Promise<RunQueueReport> {
  const now      = options.now ?? (() => Date.now())
  const nowIso   = options.nowIso ?? (() => new Date().toISOString())
  const budgetMs = options.budgetMs ?? RUN_BUDGET_MS
  const maxItems = options.maxItems ?? MAX_ITEMS_PER_RUN
  const staleMs  = options.staleMs ?? STALE_CLAIM_MS

  const startedAt = now()
  const reaped = await port.reapStaleClaims(new Date(startedAt - staleMs).toISOString())

  const results: RunQueueReport['results'] = []
  let stoppedEarly = false

  for (let i = 0; i < maxItems; i++) {
    if (now() - startedAt >= budgetMs) {
      stoppedEarly = true
      break
    }
    const item = await port.claimOne()
    if (!item) break

    const result = await publish(item)
    await port.finish(item.id, outcomeUpdate(result, nowIso()))
    results.push({ id: item.id, platform: item.platform, ...result })
  }

  return { reaped, results, stoppedEarly }
}

/** The slice of the supabase client this module needs — kept narrow so it can be faked. */
export interface QueueClient {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>
  from(table: string): {
    update(values: Record<string, unknown>): {
      eq(column: string, value: unknown): {
        or(filter: string): PromiseLike<{ data: unknown; error: { message: string } | null }> &
          { select(columns: string): PromiseLike<{ data: unknown; error: { message: string } | null }> }
      } & PromiseLike<{ data: unknown; error: { message: string } | null }>
    }
  }
}

export function createSupabaseQueuePort(db: QueueClient): QueuePort {
  return {
    async reapStaleClaims(cutoffIso) {
      // `claim_queue_items` sets status and claimed_at in one statement, so a row
      // is never observably `processing` with a null claimed_at — a null there means
      // the row was written by something other than the claim, and is stale by default.
      const { data, error } = await db
        .from('content_queue')
        .update({ status: 'failed', last_error: STALE_CLAIM_ERROR })
        .eq('status', 'processing')
        .or(`claimed_at.lt.${cutoffIso},claimed_at.is.null`)
        .select('id')
      if (error) throw new Error(error.message)
      return ((data ?? []) as Array<{ id: string }>).map(row => row.id)
    },

    async claimOne() {
      const { data, error } = await db.rpc('claim_queue_items', { limit_count: 1 })
      if (error) throw new Error(error.message)
      return (((data ?? []) as ClaimedItem[])[0]) ?? null
    },

    async finish(id, update) {
      const { error } = await db.from('content_queue').update(update).eq('id', id)
      if (error) throw new Error(error.message)
    },
  }
}
