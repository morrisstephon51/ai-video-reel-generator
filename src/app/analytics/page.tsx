import Sidebar from '@/components/Sidebar'
import { createServiceClient } from '@/lib/supabase/server'
import { BarChart2, TrendingUp, CheckCircle, RefreshCw, AlertCircle, Zap } from 'lucide-react'

export const dynamic = 'force-dynamic'

const AGENTS = ['viral', 'design', 'ux', 'brand', 'strategy', 'compliance'] as const
const AGENT_LABELS: Record<string, string> = {
  viral: 'Viral Potential', design: 'Design Quality', ux: 'UX / Pacing',
  brand: 'Brand Voice', strategy: 'Content Strategy', compliance: 'Compliance',
}

export default async function AnalyticsPage() {
  const db = createServiceClient()

  const [
    { count: total },
    { count: approved },
    { count: revised },
    { count: regenerated },
    { data: agentRows },
    { data: scoreRows },
  ] = await Promise.all([
    db.from('videos').select('*', { count: 'exact', head: true }),
    db.from('master_decisions').select('*', { count: 'exact', head: true }).eq('decision', 'approve'),
    db.from('master_decisions').select('*', { count: 'exact', head: true }).eq('decision', 'revise'),
    db.from('master_decisions').select('*', { count: 'exact', head: true }).eq('decision', 'regenerate'),
    db.from('agent_reviews').select('agent_name, score').order('created_at', { ascending: false }).limit(300),
    db.from('master_decisions').select('composite_score').order('created_at', { ascending: false }).limit(50),
  ])

  const avgComposite = scoreRows?.length
    ? Math.round(scoreRows.reduce((s, r) => s + (r.composite_score ?? 0), 0) / scoreRows.length)
    : 0

  const agentAverages: Record<string, number> = {}
  for (const agent of AGENTS) {
    const rows = agentRows?.filter(r => r.agent_name.includes(agent)) ?? []
    agentAverages[agent] = rows.length
      ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length)
      : 0
  }

  const approvalRate = total ? Math.round(((approved ?? 0) / (total ?? 1)) * 100) : 0

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Analytics</h1>
            <p className="text-zinc-500 text-sm mt-1">Agent council performance across all generated content</p>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Generated', value: total ?? 0, icon: BarChart2, color: 'text-brand-400' },
              { label: 'Avg Composite Score', value: `${avgComposite}/100`, icon: TrendingUp, color: 'text-blue-400' },
              { label: 'Approval Rate', value: `${approvalRate}%`, icon: CheckCircle, color: 'text-green-400' },
              { label: 'Approved Videos', value: approved ?? 0, icon: Zap, color: 'text-purple-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-surface-card border border-surface-border rounded-xl p-5">
                <Icon size={18} className={`${color} mb-3`} />
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Decision breakdown */}
          <div className="bg-surface-card border border-surface-border rounded-2xl p-6 mb-6">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Decision Breakdown</h2>
            <div className="space-y-3">
              {[
                { label: 'Approved', count: approved ?? 0, icon: CheckCircle, color: 'text-green-400', bar: 'bg-green-500' },
                { label: 'Revise',   count: revised ?? 0,     icon: RefreshCw,   color: 'text-yellow-400', bar: 'bg-yellow-500' },
                { label: 'Regenerate', count: regenerated ?? 0, icon: AlertCircle, color: 'text-red-400', bar: 'bg-red-500' },
              ].map(({ label, count, icon: Icon, color, bar }) => {
                const pct = total ? Math.round((count / (total as number)) * 100) : 0
                return (
                  <div key={label} className="flex items-center gap-3">
                    <Icon size={14} className={color} />
                    <span className="text-sm text-zinc-400 w-24">{label}</span>
                    <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full ${bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-zinc-500 w-10 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Agent score averages */}
          <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Agent Score Averages</h2>
            {agentRows?.length ? (
              <div className="space-y-3">
                {AGENTS.map(agent => {
                  const score = agentAverages[agent]
                  return (
                    <div key={agent} className="flex items-center gap-3">
                      <span className="text-sm text-zinc-400 w-36">{AGENT_LABELS[agent]}</span>
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400 font-medium w-12 text-right">{score}/100</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-600">No agent data yet — generate content to see scores.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
