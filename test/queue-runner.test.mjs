import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  runQueue,
  outcomeUpdate,
  createSupabaseQueuePort,
  RUN_BUDGET_MS,
  STALE_CLAIM_MS,
  MAX_ITEMS_PER_RUN,
  STALE_CLAIM_ERROR,
} from '../src/lib/queue-runner.ts'

const T0 = Date.parse('2026-09-28T14:00:00.000Z')

/**
 * A fake `content_queue` that enforces the two rules the real schema enforces:
 *   - `claim_queue_items` only ever claims rows whose status is 'queued'
 *   - claiming flips status to 'processing' and stamps claimed_at, atomically
 * Everything the runner can do to a row goes through here, so a test that says
 * "this row is stranded" is reading the same state the database would hold.
 */
function fakeQueue(rows, clock = () => T0) {
  const db = {
    rows: rows.map(r => ({ status: 'queued', claimed_at: null, last_error: null, ...r })),
    rpcCalls: [],
    async claim(limit) {
      this.rpcCalls.push(limit)
      const due = this.rows.filter(r => r.status === 'queued').slice(0, limit)
      for (const r of due) {
        r.status = 'processing'
        r.claimed_at = new Date(clock()).toISOString()
      }
      return due.map(r => ({ ...r }))
    },
  }
  const port = {
    async reapStaleClaims(cutoffIso) {
      const reaped = db.rows.filter(
        r => r.status === 'processing' && (r.claimed_at === null || r.claimed_at < cutoffIso),
      )
      for (const r of reaped) {
        r.status = 'failed'
        r.last_error = STALE_CLAIM_ERROR
      }
      return reaped.map(r => r.id)
    },
    async claimOne() {
      return (await db.claim(1))[0] ?? null
    },
    async finish(id, update) {
      Object.assign(db.rows.find(r => r.id === id), update)
    },
  }
  return { db, port }
}

const ready = async item => ({ outcome: 'ready', reason: `${item.platform} bundle ready` })
const posted = async () => ({ outcome: 'posted', postId: 'yt-1' })

// ---------------------------------------------------------------------------
// 1. The orphan: a run killed mid-publish must not take untouched rows with it
// ---------------------------------------------------------------------------

test('a run killed mid-publish strands only the row it was actually publishing', async () => {
  const { db, port } = fakeQueue([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }]
    .map(r => ({ ...r, platform: 'youtube' })))

  // The platform kills the function mid-upload on the very first item.
  const killed = async () => { throw new Error('FUNCTION_INVOCATION_TIMEOUT') }
  await assert.rejects(runQueue(port, killed, { now: () => T0 }))

  const byStatus = s => db.rows.filter(r => r.status === s).map(r => r.id)
  assert.deepEqual(byStatus('processing'), ['a'], 'only the in-flight row is left processing')
  assert.deepEqual(byStatus('queued'), ['b', 'c', 'd', 'e'], 'untouched rows stay claimable')
})

test('claims are issued one row at a time, never as a batch', async () => {
  const { db, port } = fakeQueue([{ id: 'a', platform: 'tiktok' }, { id: 'b', platform: 'tiktok' }])
  await runQueue(port, ready, { now: () => T0 })
  assert.deepEqual(db.rpcCalls, [1, 1, 1], 'one row per claim, plus the empty claim that ends the run')
})

// ---------------------------------------------------------------------------
// 2. The reaper: abandoned rows become visible instead of sitting silent
// ---------------------------------------------------------------------------

test('a row abandoned in processing by a dead run is failed with a reason', async () => {
  const { db, port } = fakeQueue([{ id: 'old', platform: 'youtube' }])
  db.rows[0].status = 'processing'
  db.rows[0].claimed_at = new Date(T0 - STALE_CLAIM_MS - 1).toISOString()

  const report = await runQueue(port, ready, { now: () => T0 })

  assert.deepEqual(report.reaped, ['old'])
  assert.equal(db.rows[0].status, 'failed')
  assert.match(db.rows[0].last_error, /Interrupted mid-publish/)
  assert.match(db.rows[0].last_error, /check there first/, 'says the post may already be live')
})

test('a row claimed moments ago is left alone — reaping it would race a live run', async () => {
  const { db, port } = fakeQueue([{ id: 'live', platform: 'youtube' }])
  db.rows[0].status = 'processing'
  db.rows[0].claimed_at = new Date(T0 - 5_000).toISOString()

  const report = await runQueue(port, ready, { now: () => T0 })

  assert.deepEqual(report.reaped, [])
  assert.equal(db.rows[0].status, 'processing')
})

test('a recovered row and a fresh publish are reported by the same invocation', async () => {
  const { db, port } = fakeQueue([{ id: 'old', platform: 'youtube' }, { id: 'new', platform: 'tiktok' }])
  db.rows[0].status = 'processing'
  db.rows[0].claimed_at = new Date(T0 - STALE_CLAIM_MS - 1).toISOString()

  const report = await runQueue(port, ready, { now: () => T0 })

  assert.deepEqual(report.reaped, ['old'])
  assert.deepEqual(report.results.map(r => r.id), ['new'])
})

test('the reaper still runs when the publish loop dies mid-run', async () => {
  const { db, port } = fakeQueue([{ id: 'old', platform: 'youtube' }, { id: 'new', platform: 'youtube' }])
  db.rows[0].status = 'processing'
  db.rows[0].claimed_at = new Date(T0 - STALE_CLAIM_MS - 1).toISOString()

  const killed = async () => { throw new Error('FUNCTION_INVOCATION_TIMEOUT') }
  await assert.rejects(runQueue(port, killed, { now: () => T0 }))

  // The runs that strand rows are the runs that die, so a reaper that waited until
  // after the publish loop would never fire on the days it is needed.
  assert.equal(db.rows[0].status, 'failed', 'the abandoned row is recovered before any publishing starts')
})

// ---------------------------------------------------------------------------
// 3. The budget: never start an upload the platform is about to kill
// ---------------------------------------------------------------------------

test('no new item is claimed once the run budget is spent', async () => {
  const { db, port } = fakeQueue([{ id: 'a', platform: 'tiktok' }, { id: 'b', platform: 'tiktok' }])
  let t = T0
  const report = await runQueue(port, async item => { t += RUN_BUDGET_MS; return ready(item) }, { now: () => t })

  assert.equal(report.results.length, 1)
  assert.equal(report.stoppedEarly, true)
  assert.equal(db.rows[1].status, 'queued', 'the unstarted row is left for the next run')
})

test('the budget leaves headroom under the route maxDuration of 60s', () => {
  const maxDuration = Number(
    readFileSync(new URL('../src/app/api/cron/publish/route.ts', import.meta.url), 'utf8')
      .match(/maxDuration\s*=\s*(\d+)/)[1],
  )
  assert.ok(RUN_BUDGET_MS < maxDuration * 1000, `${RUN_BUDGET_MS}ms must be under ${maxDuration}s`)
})

test('a full run stops at MAX_ITEMS_PER_RUN', async () => {
  const { db, port } = fakeQueue(
    Array.from({ length: MAX_ITEMS_PER_RUN + 3 }, (_, i) => ({ id: `r${i}`, platform: 'tiktok' })),
  )
  const report = await runQueue(port, ready, { now: () => T0 })
  assert.equal(report.results.length, MAX_ITEMS_PER_RUN)
  assert.equal(db.rows.filter(r => r.status === 'queued').length, 3)
})

// ---------------------------------------------------------------------------
// 4. Outcome mapping is unchanged from the behaviour this fix replaced
// ---------------------------------------------------------------------------

test('outcomeUpdate maps each publish outcome onto the queue columns', () => {
  assert.deepEqual(outcomeUpdate({ outcome: 'posted', postId: 'yt-9' }, 'NOW'), {
    status: 'posted', posted_at: 'NOW', platform_post_id: 'yt-9', last_error: null,
  })
  assert.deepEqual(outcomeUpdate({ outcome: 'ready', reason: 'why' }, 'NOW'), {
    status: 'ready', last_error: 'why',
  })
  assert.deepEqual(outcomeUpdate({ outcome: 'failed', error: 'boom' }, 'NOW'), {
    status: 'failed', last_error: 'boom',
  })
})

test('a posted item clears the error left by an earlier attempt', async () => {
  const { db, port } = fakeQueue([{ id: 'a', platform: 'youtube', last_error: 'stale note' }])
  await runQueue(port, posted, { now: () => T0, nowIso: () => 'NOW' })
  assert.equal(db.rows[0].status, 'posted')
  assert.equal(db.rows[0].last_error, null)
  assert.equal(db.rows[0].posted_at, 'NOW')
})

// ---------------------------------------------------------------------------
// 5. The supabase adapter builds the query the runner's semantics depend on
// ---------------------------------------------------------------------------

function fakeSupabase(updateResult = { data: [{ id: 'x' }], error: null }) {
  const calls = { rpc: [], update: [], eq: [], or: [], select: [] }
  const chain = {
    eq(col, val) { calls.eq.push([col, val]); return this },
    or(filter) { calls.or.push(filter); return this },
    select(cols) { calls.select.push(cols); return Promise.resolve(updateResult) },
    then(res, rej) { return Promise.resolve(updateResult).then(res, rej) },
  }
  const db = {
    rpc(fn, args) { calls.rpc.push([fn, args]); return Promise.resolve({ data: [], error: null }) },
    from() { return { update(values) { calls.update.push(values); return chain } } },
  }
  return { db, calls }
}

test('the reaper only touches processing rows older than the cutoff', async () => {
  const { db, calls } = fakeSupabase()
  const port = createSupabaseQueuePort(db)
  await port.reapStaleClaims('CUTOFF')

  assert.deepEqual(calls.update[0], { status: 'failed', last_error: STALE_CLAIM_ERROR })
  assert.deepEqual(calls.eq[0], ['status', 'processing'], 'never touches queued/ready/posted rows')
  assert.equal(calls.or[0], 'claimed_at.lt.CUTOFF,claimed_at.is.null')
  assert.deepEqual(calls.select, ['id'], 'must select, or the reaped ids come back empty')
})

test('the adapter asks the RPC for exactly one row', async () => {
  const { db, calls } = fakeSupabase()
  await createSupabaseQueuePort(db).claimOne()
  assert.deepEqual(calls.rpc, [['claim_queue_items', { limit_count: 1 }]])
})

test('a supabase error surfaces instead of being read as an empty queue', async () => {
  const { db } = fakeSupabase({ data: null, error: { message: 'permission denied' } })
  await assert.rejects(createSupabaseQueuePort(db).reapStaleClaims('CUTOFF'), /permission denied/)
})
