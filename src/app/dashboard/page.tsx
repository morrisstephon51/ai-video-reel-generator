import Sidebar from '@/components/Sidebar'
import { createServiceClient } from '@/lib/supabase/server'
import { Sparkles, Video, CheckCircle, Zap } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const db = createServiceClient()

  const [
    { count: totalVideos },
    { count: approvedVideos },
    { count: errorCount },
    { data: recentVideos },
  ] = await Promise.all([
    db.from('videos').select('*', { count: 'exact', head: true }),
    db.from('master_decisions').select('*', { count: 'exact', head: true }).eq('decision', 'approve'),
    db.from('error_logs').select('*', { count: 'exact', head: true }).eq('resolved', false),
    db.from('videos').select('id, topic, status, created_at').order('created_at', { ascending: false }).limit(5),
  ])

  const stats = [
    { label: 'Total Videos',    value: totalVideos ?? 0,   icon: Video,         color: 'text-brand-400'  },
    { label: 'Agent Approved',  value: approvedVideos ?? 0, icon: CheckCircle,   color: 'text-green-400'  },
    { label: 'Active Errors',   value: errorCount ?? 0,    icon: Zap,           color: 'text-yellow-400' },
    { label: 'Agents Online',   value: 6,                   icon: Sparkles,      color: 'text-purple-400' },
  ]

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-zinc-500 text-sm mt-1">Your autonomous content engine status</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {stats.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-surface-card border border-surface-border rounded-xl p-5">
                <Icon size={18} className={`${color} mb-3`} />
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Quick action */}
          <div className="bg-gradient-to-br from-brand-500/10 to-purple-500/10 border border-brand-500/20 rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-1">Generate New Content</h2>
            <p className="text-sm text-zinc-400 mb-4">
              Enter a topic or idea — the AI enhances your prompt, generates the video, runs it through 6 specialist agents, and prepares it for publishing.
            </p>
            <Link
              href="/generate"
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              <Sparkles size={15} />
              Start Generating
            </Link>
          </div>

          {/* Recent videos */}
          {recentVideos?.length ? (
            <div>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Recent</h2>
              <div className="space-y-2">
                {recentVideos.map(v => (
                  <div key={v.id} className="bg-surface-card border border-surface-border rounded-lg px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-white">{v.topic}</span>
                    <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{v.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-zinc-600">
              <Video size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No videos yet — generate your first one</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
