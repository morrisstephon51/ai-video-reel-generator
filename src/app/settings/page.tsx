'use client'
import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { Settings, Save, CheckCircle, Loader2 } from 'lucide-react'

interface StyleProfile {
  tone: string
  pacing: string
  caption_format: string
  hashtag_strategy: string
  visual_style: string
  hook_style: string
}

const DEFAULTS: StyleProfile = {
  tone:              'confident, bold, conversational',
  pacing:            'fast-cut, 3-5 seconds per scene',
  caption_format:    'short punchy line + CTA',
  hashtag_strategy:  '3 niche + 2 trending + 1 brand',
  visual_style:      'clean, bold text overlays',
  hook_style:        'question or bold statement in first 3 seconds',
}

const FIELDS: Array<{ key: keyof StyleProfile; label: string; hint: string }> = [
  { key: 'tone',             label: 'Brand Tone',        hint: 'e.g. confident, bold, conversational' },
  { key: 'pacing',           label: 'Scene Pacing',      hint: 'e.g. fast-cut, 3-5 seconds per scene' },
  { key: 'caption_format',   label: 'Caption Format',    hint: 'e.g. short punchy line + CTA' },
  { key: 'hashtag_strategy', label: 'Hashtag Strategy',  hint: 'e.g. 3 niche + 2 trending + 1 brand' },
  { key: 'visual_style',     label: 'Visual Style',      hint: 'e.g. clean, bold text overlays, cinematic' },
  { key: 'hook_style',       label: 'Hook Style',        hint: 'e.g. question or bold statement in first 3 seconds' },
]

export default function SettingsPage() {
  const [profile, setProfile]   = useState<StyleProfile>(DEFAULTS)
  const [status, setStatus]     = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [loaded, setLoaded]     = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => { if (d.profile) setProfile({ ...DEFAULTS, ...d.profile }); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  async function save() {
    setStatus('saving')
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      if (!res.ok) throw new Error('Save failed')
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  function reset() {
    setProfile(DEFAULTS)
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-zinc-500 text-sm mt-1">Configure your brand voice and content style. These are injected into every generation.</p>
          </div>

          <div className="bg-surface-card border border-surface-border rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-surface-border">
              <Settings size={16} className="text-brand-400" />
              <h2 className="text-sm font-semibold text-zinc-300">Style Profile</h2>
            </div>

            {!loaded ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-zinc-600" />
              </div>
            ) : (
              <div className="space-y-5">
                {FIELDS.map(({ key, label, hint }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>
                    <input
                      type="text"
                      value={profile[key]}
                      onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={hint}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 pt-4 border-t border-surface-border">
              <button
                onClick={save}
                disabled={status === 'saving' || !loaded}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                {status === 'saving' ? <Loader2 size={14} className="animate-spin" /> :
                 status === 'saved'  ? <CheckCircle size={14} /> : <Save size={14} />}
                {status === 'saved' ? 'Saved!' : status === 'saving' ? 'Saving…' : 'Save Settings'}
              </button>
              <button
                onClick={reset}
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Reset to defaults
              </button>
              {status === 'error' && (
                <span className="text-xs text-red-400">Save failed — check your connection</span>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
