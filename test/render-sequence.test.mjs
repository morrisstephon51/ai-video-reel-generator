import test from 'node:test'
import assert from 'node:assert/strict'
import { runRenderSequence } from '../src/lib/render-sequence.ts'

/**
 * A fake capture rig that records the ORDER of every side effect.
 *
 * The bug this guards against is invisible to any per-call assertion: each
 * individual load/draw/hold is correct on its own, and the finished report is
 * identical either way. Only the *sequence* distinguishes a clean render from
 * one that recorded its own image fetches. So every test here reads `events`.
 */
function rig({ loadDelays = [], failAt = -1 } = {}) {
  const events = []
  let recording = false
  const hooks = {
    loadFrame: async i => {
      assert.equal(recording, false,
        `loadFrame(${i}) ran while the recorder was live — its fetch time is being recorded into the video`)
      events.push(`load:${i}`)
      const ms = loadDelays[i] ?? 0
      if (ms) await new Promise(r => setTimeout(r, ms))
      if (i === failAt) throw new Error(`image ${i} failed`)
      return { frame: i }
    },
    drawFrame: (i, frame) => {
      assert.equal(frame.frame, i, `drawFrame(${i}) got the wrong frame`)
      events.push(`draw:${i}`)
    },
    startRecording: () => { recording = true; events.push('start') },
    hold: ms => { events.push(`hold:${ms}`); return Promise.resolve() },
    stopRecording: async () => { recording = false; events.push('stop') },
    onPreload: (loaded, total) => events.push(`preload:${loaded}/${total}`),
    onScene: i => events.push(`scene:${i}`),
  }
  return { events, hooks }
}

test('every image is loaded before recording starts', async () => {
  const { events, hooks } = rig()
  await runRenderSequence([1000, 2000, 3000], hooks)

  const startAt = events.indexOf('start')
  assert.notEqual(startAt, -1, 'recording never started')
  const loadsAfterStart = events.slice(startAt).filter(e => e.startsWith('load:'))
  assert.deepEqual(loadsAfterStart, [],
    `images were fetched after recording began: ${loadsAfterStart.join(', ')}`)
  assert.equal(events.filter(e => e.startsWith('load:')).length, 3)
})

test('a frame is on the canvas before recording starts, so the video never opens blank', async () => {
  const { events, hooks } = rig()
  await runRenderSequence([1000, 2000], hooks)

  const startAt = events.indexOf('start')
  const firstDrawAt = events.findIndex(e => e.startsWith('draw:'))
  assert.notEqual(firstDrawAt, -1, 'nothing was ever drawn')
  assert.ok(firstDrawAt < startAt,
    `recording started with a blank canvas (first draw at ${firstDrawAt}, start at ${startAt})`)
  assert.equal(events[firstDrawAt], 'draw:0', 'the pre-roll frame must be scene 0')
})

test('slow image loads do not leak into the recording', async () => {
  // Mirrors the real failure mode: proxy-image allows up to 55s per image.
  const { events, hooks } = rig({ loadDelays: [30, 30, 30] })
  await runRenderSequence([1000, 1000, 1000], hooks)

  const startAt = events.indexOf('start')
  assert.deepEqual(events.slice(startAt).filter(e => e.startsWith('load:')), [])
})

test('each scene is held for exactly its own duration, so total length is the sum', async () => {
  const { events, hooks } = rig()
  await runRenderSequence([1500, 4000, 2500], hooks)

  const holds = events.filter(e => e.startsWith('hold:')).map(e => Number(e.slice(5)))
  assert.deepEqual(holds, [1500, 4000, 2500])
  assert.equal(holds.reduce((a, b) => a + b, 0), 8000,
    'recorded length must equal the sum of scene durations — that is what keeps the voiceover in sync')
})

test('scene 0 is not redrawn once recording starts', async () => {
  const { events, hooks } = rig()
  await runRenderSequence([1000, 1000], hooks)
  assert.equal(events.filter(e => e === 'draw:0').length, 1)
})

test('every scene is drawn, in order', async () => {
  const { events, hooks } = rig()
  await runRenderSequence([1000, 1000, 1000, 1000], hooks)
  assert.deepEqual(events.filter(e => e.startsWith('draw:')), ['draw:0', 'draw:1', 'draw:2', 'draw:3'])
})

test('a failed image aborts BEFORE recording starts — no partial video, no live recorder', async () => {
  const { events, hooks } = rig({ failAt: 1 })
  await assert.rejects(() => runRenderSequence([1000, 1000, 1000], hooks), /image 1 failed/)

  assert.ok(!events.includes('start'),
    'recording started even though an image failed — the caller now has to discard a partial video')
  assert.ok(!events.includes('stop'))
  assert.deepEqual(events.filter(e => e.startsWith('load:')), ['load:0', 'load:1'],
    'preload must stop at the first failure rather than fetching the rest')
})

test('recording is stopped exactly once, after the final hold', async () => {
  const { events, hooks } = rig()
  await runRenderSequence([1000, 1000], hooks)

  assert.equal(events.filter(e => e === 'stop').length, 1)
  assert.equal(events.at(-1), 'stop')
  assert.equal(events.at(-2), 'hold:1000')
})

test('progress is reported for both phases', async () => {
  const { events, hooks } = rig()
  await runRenderSequence([1000, 1000, 1000], hooks)

  assert.deepEqual(events.filter(e => e.startsWith('preload:')), ['preload:1/3', 'preload:2/3', 'preload:3/3'])
  assert.deepEqual(events.filter(e => e.startsWith('scene:')), ['scene:0', 'scene:1', 'scene:2'])
  // preload progress must finish before scene progress begins, or the UI lies
  assert.ok(events.lastIndexOf('preload:3/3') < events.indexOf('scene:0'))
})

test('the full event sequence is preload-then-record', async () => {
  const { events, hooks } = rig()
  await runRenderSequence([1000, 2000], hooks)

  assert.deepEqual(events, [
    'load:0', 'preload:1/2',
    'load:1', 'preload:2/2',
    'draw:0',
    'start',
    'scene:0', 'hold:1000',
    'scene:1', 'draw:1', 'hold:2000',
    'stop',
  ])
})

test('an empty scene list is rejected rather than producing an empty recording', async () => {
  const { events, hooks } = rig()
  await assert.rejects(() => runRenderSequence([], hooks), /no scenes/)
  assert.deepEqual(events, [])
})

test('hooks with no optional callbacks still run', async () => {
  const calls = []
  await runRenderSequence([100], {
    loadFrame: async i => { calls.push(`load:${i}`); return i },
    drawFrame: i => calls.push(`draw:${i}`),
    startRecording: () => calls.push('start'),
    hold: () => Promise.resolve(),
    stopRecording: async () => calls.push('stop'),
  })
  assert.deepEqual(calls, ['load:0', 'draw:0', 'start', 'stop'])
})
