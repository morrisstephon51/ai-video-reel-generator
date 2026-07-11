'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { CalendarClock, Loader2, RefreshCw, Send, Copy, Check, Download, ExternalLink } from 'lucide-react'
import clsx from 'clsx'

interface QueueRow {
  id: string
  platform: string
  title: string
  caption: string | null
  hashtags: string[]
  thumbnail_url: string | null
  video_url: string | null
  scheduled_at: string
  posted_at: string | null
  status: string
  platform_post_id: string | null
  last_error: string | null
}

const STATUS_STYLES: Record<string, string> = {
  queued: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  ready:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  posted: 'bg-green-500/10 text-green-400 border-green-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
}

export default function QueuePage() {
  const [queue, setQueue]         = useState<QueueRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [processing, setProcessing] = useState(false)
  const [copied, setCopied]       = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/schedule')
      const data = await res.json()
      setQueue(data.queue ?? [])
    } catch { /* keep last state */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function processNow() {
    setProcessing(true)
    try {
      await fetch('/api/cron/publish', { method: 'POST' })
      await load()
    } catch { /* surfaced via statuses */ }
    setProcessing(false)
  }

  function copy(id: string, row: QueueRow) {
    const text = `${row.title}\n\n${row.caption ?? ''}\n\n${(row.hashtags ?? []).join(' ')}`.trim()
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(id)
    setTimeout(() => setCopied(''), 1500)
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Publish Queue</h1>
              <p className="text-zinc-500 text-sm mt-1">
                Scheduled posts across every platform. YouTube auto-posts when connected; others become one-tap ready bundles.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={load}
                disabled={loading}
                className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white border border-surface-border px-3 py-2 rounded-lg disabled:opacity-50"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
              <button
                onClick={processNow}
                disabled={processing}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium px-3 py-2 rounded-lg disabled:opacity-50"
              >
                {processing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Process due posts now
              </button>
            </div>
          </div>

          {loading && !queue.length ? (
            <div className="text-center py-20">
              <Loader2 size={24} className="animate-spin text-brand-400 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">Loading queue...</p>
            </div>
          ) : !queue.length ? (
            <div className="text-center py-20 text-zinc-600">
              <CalendarClock size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nothing scheduled yet — approve a video and hit “Schedule for Publishing”.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map(row => (
                <div key={row.id} className="bg-surface-card border border-surface-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-brand-400 uppercase tracking-wider">{row.platform}</span>
                        <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full border', STATUS_STYLES[row.status] ?? STATUS_STYLES.queued)}>
                          {row.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-white font-medium leading-snug">{row.title}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {row.status === 'posted' && row.posted_at
                          ? `Posted ${new Date(row.posted_at).toLocaleString()}`
                          : `Scheduled ${new Date(row.scheduled_at).toLocaleString()}`}
                        {row.platform_post_id ? ` · ${row.platform_post_id}` : ''}
                      </p>
                      {row.last_error && row.status !== 'posted' && (
                        <p className="text-[11px] text-zinc-600 mt-1">{row.last_error}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => copy(row.id, row)}
                        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white border border-surface-border px-2.5 py-1.5 rounded-lg"
                      >
                        {copied === row.id ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                        Caption
                      </button>
                      {row.video_url && (
                        <a
                          href={row.video_url}
                          download
                          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white border border-surface-border px-2.5 py-1.5 rounded-lg"
                        >
                          <Download size={11} /> Video
                        </a>
                      )}
                      {row.thumbnail_url && (
                        <a
                          href={row.thumbnail_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white border border-surface-border px-2.5 py-1.5 rounded-lg"
                        >
                          <ExternalLink size={11} /> Thumb
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
