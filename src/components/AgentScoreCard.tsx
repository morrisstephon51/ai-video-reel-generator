'use client'
import clsx from 'clsx'

interface Props {
  name: string
  score: number
  critique: string
  role: string
}

function ScoreRing({ score }: { score: number }) {
  const r = 20
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <svg width="52" height="52" className="rotate-[-90deg]">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#2a2a2a" strokeWidth="4" />
      <circle
        cx="26" cy="26" r={r} fill="none"
        stroke={color} strokeWidth="4"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="score-ring transition-all duration-700"
      />
      <text
        x="26" y="26" textAnchor="middle" dominantBaseline="middle"
        className="rotate-90 origin-center"
        style={{ fontSize: 11, fill: '#fff', fontWeight: 700, rotate: '90deg' }}
        transform="rotate(90, 26, 26)"
      >
        {score}
      </text>
    </svg>
  )
}

export default function AgentScoreCard({ name, score, critique, role }: Props) {
  return (
    <div className={clsx(
      'bg-surface-card border rounded-xl p-4 flex gap-4',
      score >= 80 ? 'border-green-500/20' : score >= 60 ? 'border-yellow-500/20' : 'border-red-500/20'
    )}>
      <ScoreRing score={score} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-white">{name}</span>
          <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full">{role}</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">{critique}</p>
      </div>
    </div>
  )
}
