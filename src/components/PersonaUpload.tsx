'use client'
import { useEffect, useRef, useState } from 'react'
import { User, Loader2, Trash2, Upload } from 'lucide-react'
import clsx from 'clsx'

interface Persona {
  id: string
  name: string
  image_url: string
}

interface Props {
  enabled: boolean
  onChange: (enabled: boolean, personaUrl: string | null) => void
}

async function extractFrame(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file)
  try {
    if (file.type.startsWith('image/')) {
      const img = new Image()
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = objectUrl })
      return frameToDataUrl(img, img.width, img.height)
    }
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.src = objectUrl
    await new Promise((res, rej) => { video.onloadedmetadata = res; video.onerror = rej })
    video.currentTime = Math.min(video.duration / 2, 3)
    await new Promise((res, rej) => { video.onseeked = res; video.onerror = rej })
    return frameToDataUrl(video, video.videoWidth, video.videoHeight)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function frameToDataUrl(source: CanvasImageSource, srcW: number, srcH: number): string {
  const maxSide = 1024
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(srcW * scale)
  canvas.height = Math.round(srcH * scale)
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.9)
}

export default function PersonaUpload({ enabled, onChange }: Props) {
  const [persona, setPersona] = useState<Persona | null>(null)
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/persona')
      .then(r => r.json())
      .then(d => { if (d.persona) { setPersona(d.persona); onChange(enabled, d.persona.image_url) } })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleFile(file: File) {
    setBusy(true)
    setError('')
    try {
      const imageDataUrl = await extractFrame(file)
      const res = await fetch('/api/persona', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPersona(data.persona)
      onChange(true, data.persona.image_url)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function removePersona() {
    setPersona(null)
    onChange(false, null)
    fetch('/api/persona', { method: 'DELETE' }).catch(() => {})
  }

  return (
    <div className="bg-surface-card border border-surface-border rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {persona ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={persona.image_url} alt="Your avatar" className="w-10 h-10 rounded-full object-cover border border-brand-500/40" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
              <User size={16} className="text-zinc-500" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-white">Star in your own videos</p>
            <p className="text-xs text-zinc-500">
              {persona
                ? 'Avatar ready — scenes will feature you when enabled'
                : 'Upload one video or photo of yourself — the AI uses it to put you in every scene'}
            </p>
          </div>
        </div>
        {persona && (
          <button
            onClick={() => onChange(!enabled, persona.image_url)}
            className={clsx('w-9 h-5 rounded-full transition-colors relative shrink-0', enabled ? 'bg-brand-500' : 'bg-zinc-700')}
            aria-label="Toggle avatar mode"
          >
            <span className={clsx('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform', enabled ? 'translate-x-4' : 'translate-x-0.5')} />
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="video/*,image/*"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-2 text-xs text-brand-400 hover:text-brand-300 disabled:opacity-50"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {busy ? 'Processing...' : persona ? 'Replace avatar' : 'Upload video or photo'}
        </button>
        {persona && (
          <button onClick={removePersona} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400">
            <Trash2 size={12} /> Remove
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  )
}
