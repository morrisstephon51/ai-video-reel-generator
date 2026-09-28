import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

/**
 * Structural contract. This file deliberately imports NOTHING from the fix, so
 * it runs unchanged against the default branch — where it is red.
 *
 * Why structural: the regression it guards against was not a wrong expression,
 * it was a *relocation*. Commit deec9ad ("Fix broken nav, dead buttons, and add
 * missing pages") replaced VideoRenderer's call to the shared engine with a
 * 130-line inline copy, silently undoing the recorder/AudioContext leak fixes
 * that 0228686 ("render leak fixes") had landed four days earlier. No behavioural
 * assertion about VideoRenderer would have caught that; only one that says
 * "there is exactly one engine, and this component calls it" does.
 */
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

/** Every .ts/.tsx file under src/, as repo-relative paths. */
const sourceFiles = () =>
  readdirSync(new URL('../src', import.meta.url), { recursive: true, encoding: 'utf8' })
    .filter(f => /\.tsx?$/.test(f))
    .map(f => `src/${f}`.split('\\').join('/'))
    .sort()

const VIDEO_RENDERER = 'src/components/VideoRenderer.tsx'
const CLIP_EXPORTER = 'src/components/ClipExporter.tsx'
const ENGINE = 'src/lib/render.ts'

test('VideoRenderer calls the shared render engine instead of reimplementing it', () => {
  const src = read(VIDEO_RENDERER)
  assert.match(src, /import\s*\{[^}]*\brenderScenes\b[^}]*\}\s*from\s*'@\/lib\/render'/,
    `${VIDEO_RENDERER} must import renderScenes from @/lib/render — a type-only import means it has its own engine again`)
  assert.match(src, /\brenderScenes\s*\(/, `${VIDEO_RENDERER} must actually call renderScenes`)
})

test('the canvas capture engine exists in exactly one place', () => {
  // Every construct below is engine internals. A component holding any of them
  // is a second engine, and second engines drift out of sync with the fixes.
  for (const [file, label] of [[VIDEO_RENDERER, 'VideoRenderer'], [CLIP_EXPORTER, 'ClipExporter']]) {
    const src = read(file)
    for (const construct of ['new MediaRecorder(', 'new AudioContext(', 'captureStream(', 'MediaRecorder.isTypeSupported(']) {
      assert.ok(!src.includes(construct),
        `${label} contains engine internals (${construct}) — that belongs to ${ENGINE} alone`)
    }
  }
})

test('an AudioContext is only ever created where it is also closed', () => {
  // Scoping this to render.ts would make it pass on the default branch, where the
  // leak lives in VideoRenderer. The invariant is tree-wide: exactly one file may
  // construct an AudioContext, and that file must also close it.
  const owners = sourceFiles().filter(f => read(f).includes('new AudioContext('))
  assert.deepEqual(owners, [ENGINE],
    `only ${ENGINE} may construct an AudioContext (browsers cap concurrent contexts, so a leaked one makes later renders silent); found: ${owners.join(', ') || 'none'}`)

  const engine = read(ENGINE)
  assert.match(engine, /audioCtx\?\.close\(\)|audioCtx\.close\(\)/,
    `${ENGINE} never closes its AudioContext`)
  assert.match(engine, /finally\s*\{/, `${ENGINE} must clean up in a finally block, not only on the happy path`)
})

test('the output extension is taken from the engine result, never from React state', () => {
  const src = read(VIDEO_RENDERER)
  assert.match(src, /setExt\(\s*result\.ext\s*\)/,
    `${VIDEO_RENDERER} must set the extension from the engine's result`)
  // `const ext = <state> === 'video/mp4' ? ...` inside the async render closure reads
  // the pre-update value, so a WebM blob was handed to the uploader labelled .mp4.
  assert.ok(!/outputMime/.test(src),
    `${VIDEO_RENDERER} derives its extension from an outputMime state variable; a setState in the same closure has not applied yet, so the first render mislabels the container`)
})

test('the engine never fetches an image while the recorder is running', () => {
  const engine = read(ENGINE)
  assert.match(engine, /\brunRenderSequence\b/,
    `${ENGINE} must delegate load/record ordering to runRenderSequence (render-sequence.ts), where it is covered by tests`)
  assert.ok(!/await\s+loadImage\s*\(/.test(engine),
    `${ENGINE} awaits loadImage inside its own loop — the canvas holds the previous frame during that fetch, so the fetch is recorded into the video and the voiceover drifts`)
})

test('both render surfaces stay wired to the single engine', () => {
  // `import type { RenderResult } from '@/lib/render'` satisfies a bare
  // "imports from @/lib/render" check while the component runs its own engine —
  // which is exactly the shape the default branch has. Require the runtime binding.
  for (const file of [VIDEO_RENDERER, CLIP_EXPORTER]) {
    const src = read(file)
    assert.match(src, /import\s*\{[^}]*\brenderScenes\b[^}]*\}\s*from\s*'@\/lib\/render'/,
      `${file} must import the runtime renderScenes binding, not just its types`)
    assert.match(src, /\brenderScenes\s*\(/, `${file} must call renderScenes`)
  }
})
