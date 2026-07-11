'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { TrendingUp, Loader2, Sparkles, RefreshCw, AlertCircle } from 'lucide-react'

interface Trend {
  topic: string
  score: number
  reason: string
}

export default function TrendsPage() {
  const [trends, setTrends] = useState<Trend[]>([])
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const router = useRouter()

  async function load() {
    setStatus('loading')
    try {
      const res = await fetch('/api/agents/trend-intelligence', { method: 'POST' })
      const data = await res.json()
      if (!data.trends?.length) throw new Error('no trends')
      setTrends(data.trends)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Trending Now</h1>
              <p className="text-zinc-500 text-sm mt-1">
                Live trends scored for your niche — one tap turns any of them into a video.
              </p>
            </div>
            <button
              onClick={load}
              disabled={status === 'loading'}
              className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white border border-surface-border px-3 py-2 rounded-lg disabled:opacity-50"
            >
              <RefreshCw size={12} className={status === 'loading' ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {status === 'loading' && (
            <div className="text-center py-20">
              <Loader2 size={24} className="animate-spin text-brand-400 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">Researching live trends + scoring for your niche...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 flex items-start gap-3">
              <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-red-400 font-medium">Could not load trends</p>
                <p className="text-xs text-zinc-500 mt-1">Trend feed may be temporarily unavailable.</p>
                <button onClick={load} className="mt-2 text-xs text-brand-400 hover:text-brand-300">Try again</button>
              </div>
            </div>
          )}

          {status === 'done' && (
            <div className="space-y-3">
              {trends.map((trend, i) => (
                <div key={i} className="bg-surface-card border border-surface-border rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                    <TrendingUp size={16} className="text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{trend.topic}</p>
                      <span className="text-xs font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full shrink-0">
                        {trend.score}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{trend.reason}</p>
                    <div className="h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min(trend.score, 100)}%` }} />
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/generate?topic=${encodeURIComponent(trend.topic)}`)}
                    className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors shrink-0"
                  >
                    <Sparkles size={12} />
                    Make video
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
