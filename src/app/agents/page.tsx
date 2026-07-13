import Sidebar from '@/components/Sidebar'
import { createServiceClient } from '@/lib/supabase/server'
import { Zap, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

const COUNCIL = [
  { name: 'Viral Agent',      role: 'Creative Director',   focus: 'Hook strength, scroll-stopping power, share-ability' },
  { name: 'Design Agent',     role: 'Visual Designer',     focus: 'Composition, color, on-screen text legibility' },
  { name: 'UX Agent',         role: 'UX Lead',             focus: 'Pacing, caption sync, watch-through flow' },
  { name: 'Brand Agent',      role: 'Brand Manager',       focus: 'Voice consistency with your Style Brain' },
  { name: 'Strategy Agent',   role: 'Content Strategist',  focus: 'CTA placement, positioning, audience fit' },
  { name: 'Compliance Agent', role: 'QA / Platform Ops',   focus: 'Platform rules, claims, safety' },
]

const SPECIALISTS = [
  'Trend Intelligence', 'SEO', 'Thumbnail', 'Caption Optimizer', 'Hook Optimizer',
  'Hashtag Research', 'A/B Tester', 'Performance Predictor', 'Content Repurposer', 'Self-Improver',
]

interface Decision { decision: string; composite_score: number; created_at: string; video_id: string }

async function loadDecisions(): Promise<{ rows: Decision[]; ok: boolean }> {
  try {
    const db = createServiceClient()
    const { data } = await db
      .from('master_decisions')
      .select('decision, composite_score, created_at, video_id')
      .order('created_at', { ascending: false })
      .limit(8)
    return { rows: (data ?? []) as Decision[], ok: true }
  } catch {
    return { rows: [], ok: false }
  }
}

const DECISION_STYLE: Record<string, { icon: typeof CheckCircle; cls: string }> = {
  approve:    { icon: CheckCircle, cls: 'text-green-400' },
  revise:     { icon: RefreshCw,   cls: 'text-yellow-400' },
  regenerate: { icon: AlertCircle, cls: 'text-red-400' },
}

export default async function AgentsPage() {
  const { rows } = await loadDecisions()

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Agents</h1>
            <p className="text-zinc-500 text-sm mt-1">
              A 6-agent council reviews every video before it can be scheduled, backed by 10 specialist agents.
            </p>
          </div>

          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Review Council</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {COUNCIL.map(a => (
              <div key={a.name} className="bg-surface-card border border-surface-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm font-semibold text-white">{a.name}</span>
                  <span className="text-xs text-zinc-500">· {a.role}</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">{a.focus}</p>
              </div>
            ))}
          </div>

          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Specialist Agents</h2>
          <div className="flex flex-wrap gap-2 mb-8">
            {SPECIALISTS.map(s => (
              <span key={s} className="flex items-center gap-1.5 text-xs text-zinc-300 bg-surface-card border border-surface-border rounded-full px-3 py-1.5">
                <Zap size={11} className="text-brand-400" />
                {s}
              </span>
            ))}
          </div>

          {rows.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Recent Decisions</h2>
              <div className="space-y-2">
                {rows.map((d, i) => {
                  const style = DECISION_STYLE[d.decision] ?? DECISION_STYLE.revise
                  const Icon = style.icon
                  return (
                    <div key={i} className="bg-surface-card border border-surface-border rounded-lg px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className={style.cls} />
                        <span className={`text-sm font-medium capitalize ${style.cls}`}>{d.decision}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-white tabular-nums">{Math.round(d.composite_score)}/100</span>
                        <span className="text-xs text-zinc-600">{new Date(d.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
