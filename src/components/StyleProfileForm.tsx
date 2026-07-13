'use client'
import { useEffect, useState } from 'react'
import { Loader2, Save, Check, Sparkles } from 'lucide-react'

interface Profile {
  niche: string
  tone: string
  pacing: string
  visual_style: string
  caption_format: string
  hashtag_strategy: string
  hook_patterns: string[] | string
}

const FIELDS: { key: keyof Profile; label: string; hint: string; textarea?: boolean }[] = [
  { key: 'niche',            label: 'Niche',            hint: 'Drives trend scoring and every prompt — e.g. "AI tools for solo founders"' },
  { key: 'tone',             label: 'Tone of voice',    hint: 'How your videos sound — e.g. "confident, bold, conversational"' },
  { key: 'pacing',           label: 'Pacing',           hint: 'Scene rhythm — e.g. "fast-cut, 3-5 seconds per scene"' },
  { key: 'visual_style',     label: 'Visual style',     hint: 'Look of the AI imagery — e.g. "clean, bold text overlays"' },
  { key: 'caption_format',   label: 'Caption format',   hint: 'How on-screen captions read — e.g. "short punchy line + bullets + CTA"' },
  { key: 'hashtag_strategy', label: 'Hashtag strategy', hint: 'Mix per post — e.g. "3 niche + 2 trending + 1 brand"' },
]

const inputStyle = {
  color: '#ffffff',
  backgroundColor: '#111111',
  WebkitTextFillColor: '#ffffff',
  WebkitAppearance: 'none' as const,
  caretColor: '#ffffff',
}

export default function StyleProfileForm() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [status, setStatus]   = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading')
  const [error, setError]     = useState('')

  useEffect(() => {
    fetch('/api/style-profile')
      .then(r => r.json())
      .then(d => {
        const p = d.profile
        setProfile({ ...p, hook_patterns: Array.isArray(p.hook_patterns) ? p.hook_patterns.join('\n') : (p.hook_patterns ?? '') })
        setStatus('idle')
      })
      .catch(() => setStatus('error'))
  }, [])

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile(p => (p ? { ...p, [key]: value } : p))
    if (status === 'saved') setStatus('idle')
  }

  async function save() {
    if (!profile) return
    setStatus('saving')
    setError('')
    try {
      const res = await fetch('/api/style-profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setStatus('saved')
    } catch (err) {
      setError((err as Error).message)
      setStatus('error')
    }
  }

  if (status === 'loading' || !profile) {
    return (
      <div className="bg-surface-card border border-surface-border rounded-2xl p-10 text-center">
        <Loader2 size={20} className="animate-spin text-brand-400 mx-auto" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4 flex items-start gap-3">
        <Sparkles size={16} className="text-brand-400 mt-0.5 shrink-0" />
        <p className="text-xs text-zinc-400 leading-relaxed">
          This is your <span className="text-white font-medium">Style Brain</span>. Every trend score, enhanced prompt,
          script, and agent review is personalized from these settings — set them once and the whole engine adapts to you.
        </p>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-2xl p-6 space-y-5">
        {FIELDS.map(({ key, label, hint }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-zinc-300 mb-1">{label}</label>
            <input
              value={profile[key] as string}
              onChange={e => set(key, e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
              style={inputStyle}
            />
            <p className="text-xs text-zinc-600 mt-1">{hint}</p>
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Hook patterns</label>
          <textarea
            value={profile.hook_patterns as string}
            onChange={e => set('hook_patterns', e.target.value)}
            rows={4}
            placeholder={'One per line\nDid you know...\nThe #1 mistake...'}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-brand-500 placeholder-zinc-600"
            style={inputStyle}
          />
          <p className="text-xs text-zinc-600 mt-1">Scroll-stopping opening lines, one per line — the script writer pulls from these.</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={status === 'saving'}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          {status === 'saving' ? <><Loader2 size={14} className="animate-spin" /> Saving...</>
            : status === 'saved' ? <><Check size={14} /> Saved</>
            : <><Save size={14} /> Save Style Brain</>}
        </button>
        {status === 'error' && <p className="text-xs text-red-400">{error || 'Save failed'}</p>}
        {status === 'saved' && <p className="text-xs text-green-400">Applied to all future generations.</p>}
      </div>
    </div>
  )
}
