import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Deliberately imports nothing from the fix, so this file also runs against the
// default branch — where both assertions below are red. A guard that the route
// has stopped calling is worth nothing, and the status styles are the only place
// a stranded row becomes visible to a human.

test('the cron route delegates to the runner and holds no queue logic of its own', () => {
  const src = readFileSync(new URL('../src/app/api/cron/publish/route.ts', import.meta.url), 'utf8')
  assert.match(src, /runQueue\(/, 'route must call the tested runner')
  assert.match(src, /createSupabaseQueuePort\(/, 'route must use the tested adapter')
  assert.doesNotMatch(src, /claim_queue_items/, 'claiming belongs in queue-runner, not inline here')
  assert.doesNotMatch(src, /'processing'/, 'status transitions belong in queue-runner')
})

test('the queue page styles the status the database actually writes', () => {
  const src = readFileSync(new URL('../src/app/queue/page.tsx', import.meta.url), 'utf8')
  const styles = src.match(/const STATUS_STYLES[\s\S]*?\n}/)[0]
  assert.match(styles, /\bprocessing:/, 'processing is a real content_queue status')
  assert.doesNotMatch(styles, /\bpublishing:/, 'publishing is not a status any code writes')
})
