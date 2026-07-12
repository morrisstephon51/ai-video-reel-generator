'use client'

export interface RenderScene {
  imageUrl: string
  duration: number
  caption?: string
}

export interface RenderOptions {
  scenes: RenderScene[]
  audioUrl?: string | null
  audioOffset?: number
  aspectRatio?: string
  textScale?: number
  onScene?: (index: number) => void
}

export interface RenderResult {
  blob: Blob
  mimeType: 'video/mp4' | 'video/webm'
  ext: 'mp4' | 'webm'
}

export function dimsFor(aspectRatio = '9:16') {
  return aspectRatio === '16:9' ? { w: 960, h: 540 } :
         aspectRatio === '1:1'  ? { w: 720, h: 720 } :
                                  { w: 540, h: 960 }
}

function proxyUrl(url: string) {
  if (url.startsWith('data:')) return url
  return `/api/proxy-image?url=${encodeURIComponent(url)}`
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 60)}`))
    img.src = src
  })
}

export function drawCaption(ctx: CanvasRenderingContext2D, caption: string, w: number, h: number, textScale = 1) {
  const grad = ctx.createLinearGradient(0, h * 0.6, 0, h)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(0,0,0,0.85)')
  ctx.fillStyle = grad
  ctx.fillRect(0, h * 0.6, w, h * 0.4)

  const fontSize = Math.round(h * 0.038 * textScale)
  ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`
  ctx.fillStyle = 'white'
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(0,0,0,0.9)'
  ctx.shadowBlur = 6

  const maxWidth = w * 0.88
  const words = caption.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word }
    else line = test
  }
  if (line) lines.push(line)

  const lineH = fontSize * 1.3
  const totalH = lines.length * lineH
  const startY = h - totalH - Math.round(h * 0.045)
  lines.forEach((l, i) => ctx.fillText(l, w / 2, startY + i * lineH))
  ctx.shadowBlur = 0
}

function drawSceneImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const imgAspect = img.width / img.height
  const canvasAspect = w / h
  let sx = 0, sy = 0, sw = img.width, sh = img.height
  if (imgAspect > canvasAspect) {
    sw = img.height * canvasAspect
    sx = (img.width - sw) / 2
  } else {
    sh = img.width / canvasAspect
    sy = (img.height - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
}

export async function renderScenes({
  scenes, audioUrl, audioOffset = 0, aspectRatio = '9:16', textScale = 1, onScene,
}: RenderOptions): Promise<RenderResult> {
  const { w, h } = dimsFor(aspectRatio)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  const stream = canvas.captureStream(30)

  let audioEl: HTMLAudioElement | null = null
  if (audioUrl) {
    audioEl = new Audio(audioUrl)
    const audioCtx = new AudioContext()
    const src = audioCtx.createMediaElementSource(audioEl)
    const dest = audioCtx.createMediaStreamDestination()
    src.connect(dest)
    src.connect(audioCtx.destination)
    stream.addTrack(dest.stream.getAudioTracks()[0])
  }

  // Pick best supported container (MP4 on Safari, WebM on Chrome)
  const mime = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm']
    .find(m => MediaRecorder.isTypeSupported(m)) ?? 'video/webm'

  const chunks: Blob[] = []
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 })
  recorder.ondataavailable = e => e.data.size > 0 && chunks.push(e.data)
  recorder.start(200)

  if (audioEl) {
    audioEl.currentTime = audioOffset
    audioEl.play().catch(() => {})
  }

  for (let i = 0; i < scenes.length; i++) {
    onScene?.(i)
    const scene = scenes[i]
    const img = await loadImage(proxyUrl(scene.imageUrl))
    drawSceneImage(ctx, img, w, h)
    if (scene.caption) drawCaption(ctx, scene.caption, w, h, textScale)
    await new Promise(r => setTimeout(r, (scene.duration ?? 4) * 1000))
  }

  recorder.stop()
  audioEl?.pause()
  await new Promise<void>(r => { recorder.onstop = () => r() })

  const finalType = mime.startsWith('video/mp4') ? 'video/mp4' : 'video/webm'
  return {
    blob: new Blob(chunks, { type: finalType }),
    mimeType: finalType,
    ext: finalType === 'video/mp4' ? 'mp4' : 'webm',
  }
}
