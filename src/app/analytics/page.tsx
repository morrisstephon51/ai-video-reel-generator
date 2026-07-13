import Sidebar from '@/components/Sidebar'
import { createServiceClient } from '@/lib/supabase/server'
import { BarChart2, Send, Clock, CheckCircle, Eye, Heart, Share2, Bookmark } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface QueueRow { platform: string; status: string }
interface AnalyticsRow { views: number; likes: number; shares: number; saves: number; comments: number }

async function load() {
  try {
    const db = createServiceClient()
    const [{ data: queue }, { data: analytics }] = await Promise.all([
      db.from('content_queue').select('platform, status').limit(1000),
      db.from('post_analytics').select('views, likes, shares, saves, comments').limit(1000),
    ])
    return { queue: (queue ?? []) as QueueRow[], analytics: (analytics ?? []) as AnalyticsRow[], ok: true }
  } catch {
    return { queue: [] as QueueRow[], analytics: [] as AnalyticsRow[], ok: false }
  }
}

export default async function AnalyticsPage() {
  const { queue, analytics, ok } = await load()

  const byStatus = (s: string) => queue.filter(q => q.status === s).length
  const byPlatform = queue.reduce<Record<string, number>>((acc, q) => {
    acc[q.platform] = (acc[q.platform] ?? 0) + 1
    return acc
  }, {})
  const sum = (k: keyof AnalyticsRow) => analytics.reduce((n, a) => n + (a[k] ?? 0), 0)

  const pipeline = [
    { label: 'Queued',  value: byStatus('queued'), icon: Clock,       color: 'text-yellow-400' },
    { label: 'Ready',   value: byStatus('ready'),  icon: Send,        color: 'text-blue-400'   },
    { label: 'Posted',  value: byStatus('posted'), icon: CheckCircle, color: 'text-green-400'  },
    { label: 'Total',   value: queue.length,       icon: BarChart2,   color: 'text-brand-400'  },
  ]

  const engagement = [
    { label: 'Views',  value: sum('views'),  icon: Eye },
    { label: 'Likes',  value: sum('likes'),  icon: Heart },
    { label: 'Shares', value: sum('shares'), icon: Share2 },
    { label: 'Saves',  value: sum('saves'),  icon: Bookmark },
  ]

  const platforms = Object.entries(byPlatform).sort((a, b) => b[1] - a[1])
  const maxPlatform = Math.max(1, ...platforms.map(([, n]) => n))

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Analytics</h1>
            <p className="text-zinc-500 text-sm mt-1">Publishing pipeline and engagement across every platform.</p>
          </div>

          {!ok && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
              <p className="text-xs text-yellow-400/90">
                Database not connected yet — connect Supabase (see SETUP.md) to see live numbers here.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {pipeline.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-surface-card border border-surface-border rounded-xl p-5">
                <Icon size={18} className={`${color} mb-3`} />
                <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-zinc-300 mb-4">Posts by platform</h2>
              {platforms.length ? (
                <div className="space-y-3">
                  {platforms.map(([platform, count]) => (
                    <div key={platform}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400 capitalize">{platform}</span>
                        <span className="text-zinc-500 tabular-nums">{count}</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(count / maxPlatform) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-600 py-6 text-center">No posts scheduled yet.</p>
              )}
            </div>

            <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-zinc-300 mb-4">Total engagement</h2>
              <div className="grid grid-cols-2 gap-4">
                {engagement.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                      <Icon size={15} className="text-zinc-400" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white tabular-nums">{value.toLocaleString()}</div>
                      <div className="text-xs text-zinc-500">{label}</div>
                    </div>
                  </div>
                ))}
              </div>
              {!analytics.length && (
                <p className="text-xs text-zinc-600 mt-4">Engagement appears here once posts are live and analytics are ingested.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
