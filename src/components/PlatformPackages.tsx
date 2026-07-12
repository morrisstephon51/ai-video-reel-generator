'use client'
import { useEffect, useRef, useState } from 'react'
import { Loader2, Copy, Check, Download, Package, RefreshCw } from 'lucide-react'
import { loadImage } from '@/lib/render'

export interface PlatformPackage {
  platform: string
  title: string
  description: string
  caption: string
  hashtags: string[]
}

interface Props {
  topic: string
  hook?: string
  voiceover?: string
  hashtags?: string[]
  onPackaged?: (packages: PlatformPackage[], thumbnailUrl: string) => void
}

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube Shorts', tiktok: 'TikTok', instagram: 'Instagram Reels',
  twitter: 'X / Twitter', linkedin: 'LinkedIn', facebook: 'Facebook Reels',
}

function drawThumbnail(canvas: HTMLCanvasElement, img: HTMLImageElement, headline: string) {
  const w = 1280, h = 720
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  const imgAspect = img.width / img.height
  let sx = 0, sy = 0, sw = img.width, sh = img.height
  if (imgAspect > w / h) { sw = img.height * (w / h); sx = (img.width - sw) / 2 }
  else { sh = img.width / (w / h); sy = (img.height - sh) / 2 }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)

  const grad = ctx.createLinearGradient(0, h * 0.45, 0, h)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(0,0,0,0.9)')
  ctx.fillStyle = grad
  ctx.fillRect(0, h * 0.45, w, h * 0.55)

  ctx.font = '900 72px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'left'
  ctx.shadowColor = 'rgba(0,0,0,0.9)'
  ctx.shadowBlur = 12

  const words = headline.toUpperCase().split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > w * 0.85 && line) { lines.push(line); line = word }
    else line = test
  }
  if (line) lines.push(line)
  const shown = lines.slice(0, 3)
  shown.forEach((l, i) => ctx.fillText(l, w * 0.06, h - 60 - (shown.length - 1 - i) * 88))
  ctx.shadowBlur = 0
}

export default function PlatformPackages({ topic, hook, voiceover, hashtags, onPackaged }: Props) {
  const [status, setStatus]         = useState<'loading' | 'done' | 'error'>('loading')
  const [packages, setPackages]     = useState<PlatformPackage[]>([])
  const [thumbUrl, setThumbUrl]     = useState('')
  const [thumbPng, setThumbPng]     = useState('')
  const [copied, setCopied]         = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  async function build(signal?: AbortSignal) {
    setStatus('loading')
    try {
      const res = await fetch('/api/package', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, hook, voiceover, hashtags, platforms: ['youtube', 'tiktok', 'instagram', 'twitter', 'linkedin', 'facebook'] }),
        signal,
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPackages(data.packages)
      setThumbUrl(data.thumbnailUrl)
      setStatus('done')
      onPackaged?.(data.packages, data.thumbnailUrl)
    } catch (err) {
      if (signal?.aborted) return
      console.error('[PlatformPackages]', err)
      setStatus('error')
    }
  }

  useEffect(() => {
    const ctl = new AbortController()
    build(ctl.signal)
    return () => ctl.abort()
  }, [topic]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!thumbUrl || !canvasRef.current) return
    const headline = packages.find(p => p.platform === 'youtube')?.title ?? topic
    loadImage(`/api/proxy-image?url=${encodeURIComponent(thumbUrl)}`)
      .then(img => {
        drawThumbnail(canvasRef.current!, img, headline)
        setThumbPng(canvasRef.current!.toDataURL('image/png'))
      })
      .catch(() => {})
  }, [thumbUrl, packages, topic])

  function copy(key: string, text: string) {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(''), 1500)
  }

  if (status === 'loading') {
    return (
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6 text-center">
        <Loader2 size={20} className="animate-spin text-brand-400 mx-auto mb-2" />
        <p className="text-xs text-zinc-500">Packaging titles, captions + thumbnail for every platform...</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
        <p className="text-xs text-red-400">Packaging failed</p>
        <button onClick={() => build()} className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300">
          <RefreshCw size={11} /> Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Package size={14} className="text-brand-400" />
        <h3 className="text-sm font-semibold text-white">Platform Packages</h3>
      </div>

      {/* Thumbnail */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-4">
        <p className="text-xs font-medium text-zinc-400 mb-3">Thumbnail (1280×720)</p>
        <canvas ref={canvasRef} className="w-full rounded-xl border border-surface-border" style={{ aspectRatio: '16/9' }} />
        {thumbPng && (
          <a
            href={thumbPng}
            download="thumbnail.png"
            className="mt-3 inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/30 text-brand-400 hover:bg-brand-500/20 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Download size={12} /> Download PNG
          </a>
        )}
      </div>

      {/* Per-platform cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {packages.map(pkg => (
          <div key={pkg.platform} className="bg-surface-card border border-surface-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-brand-400 uppercase tracking-wider">
                {PLATFORM_LABELS[pkg.platform] ?? pkg.platform}
              </span>
              <button
                onClick={() => copy(pkg.platform, `${pkg.title}\n\n${pkg.caption}\n\n${pkg.hashtags.join(' ')}`)}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white"
              >
                {copied === pkg.platform ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                {copied === pkg.platform ? 'Copied' : 'Copy all'}
              </button>
            </div>
            <p className="text-sm text-white font-medium leading-snug">{pkg.title}</p>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed line-clamp-3">{pkg.caption || pkg.description}</p>
            <p className="text-xs text-brand-400/70 mt-2 break-words">{pkg.hashtags.join(' ')}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
