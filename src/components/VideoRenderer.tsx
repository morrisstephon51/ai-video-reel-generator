'use client'
import { useState } from 'react'
import { Download, Loader2, Video, AlertCircle } from 'lucide-react'

interface Scene {
  imageUrl: string
  duration: number
  caption?: string
}

interface Props {
  scenes: Scene[]
  audioUrl?: string | null
  aspectRatio?: string
}

function proxyUrl(url: string) {
  if (url.startsWith('data:')) return url
  return `/api/proxy-image?url=${encodeURIComponent(url)}`
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 60)}`))
    img.src = src
  })
}

function drawCaption(ctx: CanvasRenderingContext2D, caption: string, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, h * 0.6, 0, h)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(0,0,0,0.85)')
  ctx.fillStyle = grad
  ctx.fillRect(0, h * 0.6, w, h * 0.4)

  const fontSize = Math.round(h * 0.038)
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

export default function VideoRenderer({ scenes, audioUrl, aspectRatio = '9:16' }: Props) {
  const [status, setStatus]     = useState<'idle' | 'rendering' | 'done' | 'error'>('idle')
  const [sceneIdx, setSceneIdx] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState('video/mp4')
  const [error, setError]       = useState('')

  const totalDuration = scenes.reduce((s, sc) => s + (sc.duration ?? 4), 0)
  const dims = aspectRatio === '16:9' ? { w: 960, h: 540 } :
               aspectRatio === '1:1'  ? { w: 720, h: 720 } :
                                        { w: 540, h: 960 }

  async function render() {
    setStatus('rendering')
    setError('')
    setSceneIdx(0)

    try {
      const { w, h } = dims
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!

      // Canvas stream at 30fps
      const stream = canvas.captureStream(30)

      // Wire audio into the stream if available
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
      setMimeType(mime.startsWith('video/mp4') ? 'video/mp4' : 'video/webm')

      const chunks: Blob[] = []
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 })
      recorder.ondataavailable = e => e.data.size > 0 && chunks.push(e.data)
      recorder.start(200)

      // Start audio
      if (audioEl) { audioEl.currentTime = 0; audioEl.play().catch(() => {}) }

      // Draw each scene for its duration
      for (let i = 0; i < scenes.length; i++) {
        setSceneIdx(i)
        const scene = scenes[i]

        // Fetch image via proxy (avoids canvas CORS tainting)
        const img = await loadImage(proxyUrl(scene.imageUrl))

        // Fill canvas with scene image (cover crop)
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
        if (scene.caption) drawCaption(ctx, scene.caption, w, h)

        await new Promise(r => setTimeout(r, (scene.duration ?? 4) * 1000))
      }

      // Stop recording
      recorder.stop()
      audioEl?.pause()
      await new Promise<void>(r => { recorder.onstop = () => r() })

      const finalType = mime.startsWith('video/mp4') ? 'video/mp4' : 'video/webm'
      const blob = new Blob(chunks, { type: finalType })
      setVideoUrl(URL.createObjectURL(blob))
      setStatus('done')
    } catch (err) {
      console.error('[VideoRenderer]', err)
      setError((err as Error).message)
      setStatus('error')
    }
  }

  const ext = mimeType === 'video/mp4' ? 'mp4' : 'webm'

  return (
    <div className="w-full">
      {status === 'idle' && (
        <button
          onClick={render}
          className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-4 rounded-xl text-sm transition-colors"
        >
          <Video size={16} />
          Create Full Video + Voiceover (~{totalDuration}s)
        </button>
      )}

      {status === 'rendering' && (
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 text-center">
          <Loader2 size={24} className="animate-spin text-brand-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white mb-1">Recording video with voiceover...</p>
          <p className="text-xs text-zinc-500 mb-3">
            Scene {sceneIdx + 1} of {scenes.length}
          </p>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-1000"
              style={{ width: `${((sceneIdx + 1) / scenes.length) * 100}%` }}
            />
          </div>
          <p className="text-xs text-zinc-600 mt-2">
            Recording in real-time to sync audio — {totalDuration - scenes.slice(0, sceneIdx).reduce((s, sc) => s + (sc.duration ?? 4), 0)}s remaining
          </p>
        </div>
      )}

      {status === 'done' && videoUrl && (
        <div>
          <video
            src={videoUrl}
            controls
            playsInline
            autoPlay
            loop
            className="w-full max-w-xs mx-auto rounded-2xl shadow-2xl bg-black block"
            style={{ aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '1:1' ? '1' : '16/9' }}
          />
          <div className="flex gap-3 mt-4">
            <a
              href={videoUrl}
              download={`ai-video-reel.${ext}`}
              className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
            >
              <Download size={14} />
              Download {ext.toUpperCase()}
            </a>
            <button
              onClick={() => { setStatus('idle'); setVideoUrl(null) }}
              className="px-4 py-3 border border-surface-border text-zinc-400 hover:text-white text-sm rounded-xl transition-colors"
            >
              Re-render
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-400 font-medium">Render failed</p>
            <p className="text-xs text-red-400/70 mt-1">{error}</p>
            <button onClick={render} className="mt-2 text-xs text-brand-400 hover:text-brand-300">Try again</button>
          </div>
        </div>
      )}
    </div>
  )
}
