'use client'
import clsx from 'clsx'
import { Play, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  id: string
  topic: string
  status: string
  createdAt: string
  thumbnailUrl?: string
  compositeScore?: number
}

const statusIcon: Record<string, React.ReactNode> = {
  'draft':            <Clock size={12} className="text-zinc-400" />,
  'assembled':        <CheckCircle size={12} className="text-green-400" />,
  'review:approve':   <CheckCircle size={12} className="text-green-400" />,
  'review:revise':    <RefreshCw size={12} className="text-yellow-400" />,
  'review:regenerate':<AlertCircle size={12} className="text-red-400" />,
}

const statusLabel: Record<string, string> = {
  'draft':            'Draft',
  'assembled':        'Ready',
  'review:approve':   'Approved',
  'review:revise':    'Revising',
  'review:regenerate':'Regenerating',
}

export default function VideoCard({ id, topic, status, createdAt, thumbnailUrl, compositeScore }: Props) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden hover:border-brand-500/40 transition-colors group cursor-pointer">
      {/* Thumbnail */}
      <div className="relative aspect-[9/16] bg-zinc-900 overflow-hidden" style={{ maxHeight: 180 }}>
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnailUrl} alt={topic} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play size={24} className="text-zinc-600" />
          </div>
        )}
        {compositeScore !== undefined && (
          <div className={clsx(
            'absolute top-2 right-2 text-xs font-bold px-1.5 py-0.5 rounded-full',
            compositeScore >= 80 ? 'bg-green-500/90 text-white' :
            compositeScore >= 60 ? 'bg-yellow-500/90 text-black' : 'bg-red-500/90 text-white'
          )}>
            {compositeScore}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-white truncate mb-1">{topic}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {statusIcon[status] ?? <Clock size={12} className="text-zinc-400" />}
            <span className="text-xs text-zinc-500">{statusLabel[status] ?? status}</span>
          </div>
          <span className="text-[10px] text-zinc-600">
            {new Date(createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  )
}
