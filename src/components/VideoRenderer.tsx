'use client'
import { useState } from 'react'
import { Download, Loader2, Video, AlertCircle } from 'lucide-react'
import { renderScenes, RenderScene, RenderResult } from '@/lib/render'

interface Props {
  scenes: RenderScene[]
  audioUrl?: string | null
  aspectRatio?: string
  textScale?: number
  onRendered?: (result: RenderResult) => void
}

export default function VideoRenderer({ scenes, audioUrl, aspectRatio = '9:16', textScale = 1, onRendered }: Props) {
  const [status, setStatus]     = useState<'idle' | 'rendering' | 'done' | 'error'>('idle')
  const [sceneIdx, setSceneIdx] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [ext, setExt]           = useState<'mp4' | 'webm'>('mp4')
  const [error, setError]       = useState('')

  const totalDuration = scenes.reduce((s, sc) => s + (sc.duration ?? 4), 0)

  async function render() {
    setStatus('rendering')
    setError('')
    setSceneIdx(0)

    try {
      const result = await renderScenes({
        scenes, audioUrl, aspectRatio, textScale,
        onScene: setSceneIdx,
      })
      // Only discard the previous render once the new one has succeeded
      if (videoUrl) URL.revokeObjectURL(videoUrl)
      setExt(result.ext)
      setVideoUrl(URL.createObjectURL(result.blob))
      setStatus('done')
      onRendered?.(result)
    } catch (err) {
      console.error('[VideoRenderer]', err)
      setError((err as Error).message)
      setStatus('error')
    }
  }

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
              onClick={() => setStatus('idle')}
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
