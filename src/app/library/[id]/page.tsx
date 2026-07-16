import Sidebar from '@/components/Sidebar'
import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, RefreshCw, AlertCircle, Clock } from 'lucide-react'
import clsx from 'clsx'

export const dynamic = 'force-dynamic'

const AGENT_LABELS: Record<string, string> = {
  'viral-potential':     'Viral Potential',
  'design-quality':      'Design Quality',
  'ux-ui':               'UX / Pacing',
  'brand-voice':         'Brand Voice',
  'content-strategy':    'Content Strategy',
  'platform-compliance': 'Platform Compliance',
}

export default async function VideoDetailPage({ params }: { params: { id: string } }) {
  const db = createServiceClient()

  const [{ data: video }, { data: reviews }, { data: decision }] = await Promise.all([
    db.from('videos').select('*').eq('id', params.id).single(),
    db.from('agent_reviews').select('*').eq('video_id', params.id).order('round', { ascending: false }),
    db.from('master_decisions').select('*').eq('video_id', params.id).order('round', { ascending: false }).limit(1).single(),
  ])

  if (!video) notFound()

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Link href="/library" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-4">
              <ArrowLeft size={12} /> Back to Library
            </Link>
            <h1 className="text-xl font-bold text-white">{video.topic ?? 'Untitled Video'}</h1>
            <p className="text-zinc-500 text-xs mt-1">{new Date(video.created_at).toLocaleString()}</p>
          </div>

          {/* Status + score */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs text-zinc-500 bg-zinc-800 px-3 py-1 rounded-full">{video.status ?? 'draft'}</span>
            {decision?.data?.composite_score !== undefined && (
              <span className={clsx(
                'flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border',
                decision.data.decision === 'approve' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                decision.data.decision === 'revise'  ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                       'bg-red-500/10 text-red-400 border-red-500/20'
              )}>
                {decision.data.decision === 'approve' ? <CheckCircle size={11} /> :
                 decision.data.decision === 'revise'  ? <RefreshCw size={11} /> : <AlertCircle size={11} />}
                {decision.data.decision?.toUpperCase()} · {decision.data.composite_score}/100
              </span>
            )}
          </div>

          {/* Script */}
          {video.script && (
            <div className="bg-surface-card border border-surface-border rounded-xl p-5 mb-6">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Voiceover Script</h2>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{video.script}</p>
            </div>
          )}

          {/* Master notes */}
          {decision?.data?.notes && (
            <div className="bg-surface-card border border-surface-border rounded-xl p-5 mb-6">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Master Agent Notes</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">{decision.data.notes}</p>
            </div>
          )}

          {/* Agent review scores */}
          {reviews?.length ? (
            <div className="bg-surface-card border border-surface-border rounded-xl p-5">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Agent Review</h2>
              <div className="space-y-4">
                {reviews.map(r => (
                  <div key={r.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-zinc-300">{AGENT_LABELS[r.agent_name] ?? r.agent_name}</span>
                      <span className={clsx(
                        'text-xs font-bold',
                        r.score >= 80 ? 'text-green-400' : r.score >= 60 ? 'text-yellow-400' : 'text-red-400'
                      )}>{r.score}/100</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full ${r.score >= 80 ? 'bg-green-500' : r.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${r.score}%` }}
                      />
                    </div>
                    {r.critique && <p className="text-xs text-zinc-500 leading-relaxed">{r.critique}</p>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-zinc-600 text-sm py-8 justify-center">
              <Clock size={16} />
              No agent review data yet
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
