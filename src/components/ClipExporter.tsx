'use client'
import { useState } from 'react'
import { Scissors, Download, Loader2 } from 'lucide-react'
import { renderScenes, RenderScene } from '@/lib/render'

interface Props {
  scenes: RenderScene[]
  audioUrl?: string | null
  textScale?: number
}

interface ClipState {
  status: 'idle' | 'rendering' | 'done' | 'error'
  url?: string
  ext?: string
}

export default function ClipExporter({ scenes, audioUrl, textScale = 1 }: Props) {
  const [clips, setClips] = useState<Record<number, ClipState>>({})

  async function exportClip(index: number) {
    setClips(c => ({ ...c, [index]: { status: 'rendering' } }))
    try {
      const audioOffset = scenes.slice(0, index).reduce((s, sc) => s + (sc.duration ?? 4), 0)
      const result = await renderScenes({
        scenes: [scenes[index]],
        audioUrl,
        audioOffset,
        textScale,
      })
      setClips(c => ({
        ...c,
        [index]: { status: 'done', url: URL.createObjectURL(result.blob), ext: result.ext },
      }))
    } catch (err) {
      console.error('[ClipExporter]', err)
      setClips(c => ({ ...c, [index]: { status: 'error' } }))
    }
  }

  return (
    <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Scissors size={14} className="text-brand-400" />
        <h3 className="text-sm font-semibold text-white">Clip Exports</h3>
      </div>
      <p className="text-xs text-zinc-500 mb-4">
        Export any scene as its own short clip — voiceover stays synced to that moment.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {scenes.map((scene, i) => {
          const clip = clips[i] ?? { status: 'idle' as const }
          return (
            <div key={i} className="border border-surface-border rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={scene.imageUrl.startsWith('data:') ? scene.imageUrl : `/api/proxy-image?url=${encodeURIComponent(scene.imageUrl)}`}
                alt={scene.caption ?? `Scene ${i + 1}`}
                className="w-full aspect-[9/16] object-cover"
              />
              <div className="p-2">
                <p className="text-[10px] text-zinc-500 truncate mb-1.5">
                  Scene {i + 1} · {scene.duration ?? 4}s{scene.caption ? ` · ${scene.caption}` : ''}
                </p>
                {clip.status === 'done' && clip.url ? (
                  <a
                    href={clip.url}
                    download={`clip-${i + 1}.${clip.ext}`}
                    className="w-full flex items-center justify-center gap-1.5 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium py-1.5 rounded-lg"
                  >
                    <Download size={11} /> Save clip
                  </a>
                ) : (
                  <button
                    onClick={() => exportClip(i)}
                    disabled={clip.status === 'rendering'}
                    className="w-full flex items-center justify-center gap-1.5 bg-brand-500/10 border border-brand-500/30 text-brand-400 hover:bg-brand-500/20 disabled:opacity-50 text-xs font-medium py-1.5 rounded-lg transition-colors"
                  >
                    {clip.status === 'rendering'
                      ? <><Loader2 size={11} className="animate-spin" /> Rendering...</>
                      : clip.status === 'error'
                      ? 'Retry'
                      : <><Scissors size={11} /> Export clip</>}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
