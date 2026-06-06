'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'

interface Scene {
  imageUrl: string
  duration: number
  caption?: string
}

interface VideoSlideshowProps {
  scenes: Scene[]
  audioUrl?: string | null
  aspectRatio?: string
}

export default function VideoSlideshow({ scenes, audioUrl, aspectRatio = '9:16' }: VideoSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [playing, setPlaying]           = useState(false)
  const [ended, setEnded]               = useState(false)
  const audioRef  = useRef<HTMLAudioElement | null>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startedAt = useRef<number>(0)
  const elapsed   = useRef<number>(0)

  const aspectClass = aspectRatio === '9:16' ? 'aspect-[9/16]' :
                      aspectRatio === '1:1'  ? 'aspect-square'  : 'aspect-video'

  const clearTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }

  const advanceScene = useCallback((index: number) => {
    const next = index + 1
    if (next >= scenes.length) {
      setPlaying(false)
      setEnded(true)
      return
    }
    setCurrentIndex(next)
    elapsed.current = 0
    startedAt.current = Date.now()
    timerRef.current = setTimeout(() => advanceScene(next), (scenes[next]?.duration ?? 4) * 1000)
  }, [scenes])

  const play = useCallback(() => {
    if (!scenes.length) return
    setPlaying(true)
    setEnded(false)
    elapsed.current = 0
    startedAt.current = Date.now()
    const dur = (scenes[currentIndex]?.duration ?? 4) * 1000
    timerRef.current = setTimeout(() => advanceScene(currentIndex), dur - elapsed.current)
    audioRef.current?.play().catch(() => {})
  }, [currentIndex, advanceScene, scenes])

  const pause = useCallback(() => {
    clearTimer()
    elapsed.current += Date.now() - startedAt.current
    setPlaying(false)
    audioRef.current?.pause()
  }, [])

  const restart = useCallback(() => {
    clearTimer()
    setCurrentIndex(0)
    setEnded(false)
    setPlaying(false)
    elapsed.current = 0
    if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.pause() }
  }, [])

  useEffect(() => () => clearTimer(), [])

  const scene = scenes[currentIndex]

  return (
    <div className="w-full">
      <div className={`relative ${aspectClass} max-w-sm mx-auto bg-black rounded-2xl overflow-hidden shadow-2xl`}>
        {scene?.imageUrl ? (
          <img
            key={scene.imageUrl}
            src={scene.imageUrl}
            alt={scene.caption ?? `Scene ${currentIndex + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
            <span className="text-zinc-600 text-sm">No image</span>
          </div>
        )}

        {scene?.caption && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <p className="text-white text-sm font-semibold text-center leading-snug">{scene.caption}</p>
          </div>
        )}

        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          {currentIndex + 1} / {scenes.length}
        </div>

        <div className="absolute top-0 left-0 right-0 flex gap-1 p-2">
          {scenes.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
              <div
                className={`h-full bg-white transition-all ${i < currentIndex ? 'w-full' : i === currentIndex && playing ? 'w-full' : 'w-0'}`}
                style={i === currentIndex && playing ? { transitionDuration: `${(scenes[i]?.duration ?? 4)}s`, transitionTimingFunction: 'linear' } : {}}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mt-4">
        <button
          onClick={restart}
          className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={playing ? pause : play}
          className="px-6 py-2 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm flex items-center gap-2 transition-colors"
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
          {ended ? 'Replay' : playing ? 'Pause' : 'Play Preview'}
        </button>
      </div>

      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="auto" />
      )}
    </div>
  )
}
