/**
 * Load/record ordering for a canvas capture, with every side effect injected.
 *
 * This lives apart from `render.ts` because the invariant that matters is an
 * *ordering* one, not a pixel one: no image may be fetched once the recorder is
 * running. A canvas keeps displaying the previous frame while a fetch is in
 * flight, so an image loaded inside the recording window is silently recorded as
 * extra seconds of the *previous* scene — and for the first scene, as a blank
 * canvas. Audio starts with the recorder and does not wait, so every one of
 * those seconds also pushes the voiceover further out of sync.
 *
 * With the side effects injected, that ordering is testable in plain Node: no
 * canvas, no MediaRecorder, no DOM.
 */
export interface RenderSequenceHooks<Frame> {
  /** Fetch one scene's image. Called for every scene *before* recording starts. */
  loadFrame: (index: number) => Promise<Frame>
  /** Paint an already-loaded frame onto the canvas. Must not do I/O. */
  drawFrame: (index: number, frame: Frame) => void
  /** Begin capturing the canvas, and start the audio track that rides with it. */
  startRecording: () => void
  /** Leave the current frame on the canvas for `ms`. */
  hold: (ms: number) => Promise<void>
  /** Stop capturing and resolve once the recorder has flushed its last chunk. */
  stopRecording: () => Promise<void>
  onPreload?: (loaded: number, total: number) => void
  onScene?: (index: number) => void
}

/**
 * Preload every frame, then record: each scene is held for exactly `holdMs[i]`,
 * so the finished video is `sum(holdMs)` long and lines up with the voiceover.
 */
export async function runRenderSequence<Frame>(
  holdMs: number[],
  hooks: RenderSequenceHooks<Frame>,
): Promise<void> {
  if (holdMs.length === 0) throw new Error('renderSequence: no scenes to render')

  // Phase 1 — all I/O happens here, while nothing is being recorded. A slow or
  // failing image now costs wall-clock time before the recording, not corrupt
  // frames inside it.
  const frames: Frame[] = []
  for (let i = 0; i < holdMs.length; i++) {
    frames.push(await hooks.loadFrame(i))
    hooks.onPreload?.(i + 1, holdMs.length)
  }

  // Phase 2 — scene 0 is on the canvas *before* capture begins, so the video
  // never opens on a blank frame.
  hooks.drawFrame(0, frames[0])
  hooks.startRecording()

  for (let i = 0; i < holdMs.length; i++) {
    hooks.onScene?.(i)
    if (i > 0) hooks.drawFrame(i, frames[i])
    await hooks.hold(holdMs[i])
  }

  await hooks.stopRecording()
}
