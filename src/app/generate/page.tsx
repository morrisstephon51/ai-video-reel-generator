'use client'
import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import AgentScoreCard from '@/components/AgentScoreCard'
import VideoSlideshow from '@/components/VideoSlideshow'
import { Sparkles, ArrowRight, RefreshCw, CheckCircle, AlertCircle, Loader2, Play } from 'lucide-react'
import clsx from 'clsx'

type Step = 'idle' | 'enhancing' | 'scripting' | 'imaging' | 'voicing' | 'assembling' | 'reviewing' | 'done' | 'error'

interface AgentScores {
  viral: number; design: number; ux: number; brand: number; strategy: number; compliance: number
}

interface ReviewResult {
  decision: 'approve' | 'revise' | 'regenerate'
  composite: number
  agentScores: AgentScores
  agentCritiques: AgentScores & Record<string, string>
  fixes: string[]
  masterNotes: string
  round: number
}

interface SlideshowScene {
  imageUrl: string
  duration: number
  caption?: string
}

const AGENT_ROLES: Record<string, string> = {
  viral:      'Creative Director',
  design:     'Visual Designer',
  ux:         'UX Lead',
  brand:      'Brand Manager',
  strategy:   'Content Strategist',
  compliance: 'QA / Platform Ops',
}

const STEP_LABELS: Record<Step, string> = {
  idle:       'Ready to generate',
  enhancing:  'Enhancing your prompt...',
  scripting:  'Writing script + scenes...',
  imaging:    'Generating AI images...',
  voicing:    'Creating AI voiceover...',
  assembling: 'Assembling video...',
  reviewing:  'Running 6-agent review council...',
  done:       'Complete',
  error:      'Error occurred',
}

export default function GeneratePage() {
  const [prompt, setPrompt]               = useState('')
  const [enhanced, setEnhanced]           = useState('')
  const [useEnhanced, setUseEnhanced]     = useState(true)
  const [step, setStep]                   = useState<Step>('idle')
  const [review, setReview]               = useState<ReviewResult | null>(null)
  const [previewScenes, setPreviewScenes] = useState<SlideshowScene[]>([])
  const [previewAudio, setPreviewAudio]   = useState<string | null>(null)
  const [error, setError]                 = useState('')

  async function enhancePrompt() {
    if (!prompt.trim()) return
    setStep('enhancing')
    setError('')
    setEnhanced('')
    setReview(null)
    setPreviewScenes([])

    try {
      const res = await fetch('/api/enhance-prompt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      setEnhanced(data.enhanced ?? prompt)
    } catch {
      setEnhanced(prompt)
    } finally {
      setStep('idle')
    }
  }

  async function generate() {
    const finalPrompt = useEnhanced && enhanced ? enhanced : prompt
    if (!finalPrompt.trim()) return

    setStep('scripting')
    setError('')
    setReview(null)
    setPreviewScenes([])
    setPreviewAudio(null)

    try {
      // 1. Create video record via server route (avoids anon key JWT issues)
      const videoRes = await fetch('/api/create-video', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_prompt: prompt, enhanced_prompt: enhanced, topic: finalPrompt.slice(0, 100) }),
      })
      const video = await videoRes.json()
      const vid = video?.id ?? ''

      // 2. Generate script
      const scriptRes = await fetch('/api/generate-script', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: finalPrompt, videoId: vid }),
      })
      const script = await scriptRes.json()

      // 3. Generate images for all scenes in parallel
      setStep('imaging')
      const scenesWithImages = await Promise.all(
        (script.scenes ?? []).map(async (scene: { visual_prompt: string; duration: number; caption: string }, i: number) => {
          const imgRes = await fetch('/api/generate-image', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: scene.visual_prompt, sceneIndex: i }),
          })
          const { imageUrl } = await imgRes.json()
          return { ...scene, imageUrl }
        })
      )

      // 4. Generate voiceover
      setStep('voicing')
      const voiceRes = await fetch('/api/generate-voice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: script.voiceover, videoId: vid }),
      })
      const { audioUrl } = await voiceRes.json()

      // 5. Assemble (returns previewMode assets — no FFmpeg on Vercel)
      setStep('assembling')
      const assembleRes = await fetch('/api/assemble-video', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: vid,
          scenes: scenesWithImages.map((s: { imageUrl: string; duration: number; caption: string }) => ({
            imageUrl: s.imageUrl, duration: s.duration, caption: s.caption,
          })),
          audioUrl,
        }),
      })
      const assembleData = await assembleRes.json()

      if (assembleData.previewMode) {
        setPreviewScenes(assembleData.scenes ?? scenesWithImages)
        setPreviewAudio(assembleData.audioUrl ?? audioUrl ?? null)
      }

      // 6. Run agent review council
      setStep('reviewing')
      const reviewRes = await fetch('/api/agent-review', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: vid,
          script:  script.voiceover,
          scenes:  scenesWithImages,
          captions: script.captions,
          hashtags: script.hashtags,
          cta:     script.cta,
          hook:    script.hook,
          round:   1,
        }),
      })
      const reviewData = await reviewRes.json()
      setReview(reviewData)
      setStep('done')

    } catch (err) {
      setStep('error')
      const msg = (err as Error).message ?? 'Unknown error'
      setError(msg)
      console.error('[generate]', msg)
    }
  }

  const isRunning = !['idle', 'done', 'error'].includes(step)

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Generate Content</h1>
            <p className="text-zinc-500 text-sm mt-1">
              Enter your idea — the AI enhances it, generates the video, and the agent council reviews it.
            </p>
          </div>

          {/* Prompt input */}
          <div className="bg-surface-card border border-surface-border rounded-2xl p-6 mb-6">
            <label className="block text-sm font-medium text-zinc-300 mb-2">Your idea or topic</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. Why our AI tool saves marketing teams 10 hours a week"
              rows={3}
              disabled={isRunning}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm placeholder-zinc-600 resize-none focus:outline-none focus:border-brand-500 disabled:opacity-50"
              style={{
                color: '#ffffff',
                backgroundColor: '#111111',
                WebkitTextFillColor: '#ffffff',
                WebkitAppearance: 'none',
                caretColor: '#ffffff',
              }}
            />

            <button
              onClick={enhancePrompt}
              disabled={!prompt.trim() || isRunning}
              className="mt-3 flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles size={14} />
              Enhance prompt with AI
            </button>
          </div>

          {/* Enhanced prompt preview */}
          {enhanced && (
            <div className="bg-surface-card border border-brand-500/30 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">AI Enhanced Version</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-zinc-500">Use enhanced</span>
                  <button
                    onClick={() => setUseEnhanced(v => !v)}
                    className={clsx(
                      'w-9 h-5 rounded-full transition-colors relative',
                      useEnhanced ? 'bg-brand-500' : 'bg-zinc-700'
                    )}
                  >
                    <span className={clsx(
                      'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                      useEnhanced ? 'translate-x-4' : 'translate-x-0.5'
                    )} />
                  </button>
                </label>
              </div>
              <p className="text-sm text-white leading-relaxed">{enhanced}</p>
              <p className="text-xs text-zinc-600 mt-2">Original preserved — only amplified.</p>
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={generate}
            disabled={!prompt.trim() || isRunning}
            className="w-full flex items-center justify-center gap-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors text-sm"
          >
            {isRunning ? (
              <><Loader2 size={16} className="animate-spin" />{STEP_LABELS[step]}</>
            ) : (
              <><Sparkles size={16} />Generate Full Video<ArrowRight size={14} /></>
            )}
          </button>

          {/* Progress steps */}
          {isRunning && (
            <div className="mt-6 space-y-2">
              {(['scripting','imaging','voicing','assembling','reviewing'] as Step[]).map((s, i) => {
                const steps: Step[] = ['scripting','imaging','voicing','assembling','reviewing']
                const idx = steps.indexOf(step)
                const done   = i < idx
                const active = i === idx
                return (
                  <div key={s} className={clsx(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm',
                    active ? 'bg-brand-500/10 text-brand-400' :
                    done   ? 'text-green-400' : 'text-zinc-600'
                  )}>
                    {done   ? <CheckCircle size={14} /> :
                     active ? <Loader2 size={14} className="animate-spin" /> :
                              <span className="w-3.5 h-3.5 rounded-full border border-current" />}
                    {STEP_LABELS[s]}
                  </div>
                )
              })}
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-400">Generation failed</p>
                <p className="text-xs text-red-400/70 mt-1">{error}</p>
                <p className="text-xs text-zinc-500 mt-1">The self-heal engine has logged this error for automatic resolution.</p>
              </div>
            </div>
          )}

          {/* Video slideshow preview */}
          {previewScenes.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Preview</h2>
              <VideoSlideshow scenes={previewScenes} audioUrl={previewAudio} />
            </div>
          )}

          {/* Agent Review Results */}
          {review && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Agent Review Council</h2>
                <div className={clsx(
                  'flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold',
                  review.decision === 'approve'    ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                  review.decision === 'revise'     ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                                     'bg-red-500/10 text-red-400 border border-red-500/20'
                )}>
                  {review.decision === 'approve' ? <CheckCircle size={11} /> :
                   review.decision === 'revise'  ? <RefreshCw size={11} /> : <AlertCircle size={11} />}
                  {review.decision.toUpperCase()} · {review.composite}/100
                </div>
              </div>

              <div className="bg-surface-card border border-surface-border rounded-xl p-4 mb-4">
                <p className="text-xs text-zinc-400 leading-relaxed">{review.masterNotes}</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {(Object.keys(review.agentScores) as Array<keyof AgentScores>).map(agent => (
                  <AgentScoreCard
                    key={agent}
                    name={agent.charAt(0).toUpperCase() + agent.slice(1) + ' Agent'}
                    role={AGENT_ROLES[agent] ?? ''}
                    score={review.agentScores[agent]}
                    critique={(review.agentCritiques as Record<string, string>)[agent] ?? ''}
                  />
                ))}
              </div>

              {review.fixes.length > 0 && (
                <div className="mt-4 bg-surface-card border border-surface-border rounded-xl p-4">
                  <p className="text-xs font-semibold text-zinc-400 mb-2">Suggested fixes</p>
                  <ul className="space-y-1">
                    {review.fixes.slice(0, 6).map((fix, i) => (
                      <li key={i} className="text-xs text-zinc-500 flex items-start gap-2">
                        <span className="text-brand-500 mt-0.5">→</span>
                        {fix}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {review.decision === 'approve' && (
                <div className="mt-4 flex gap-3">
                  <button className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-3 rounded-xl transition-colors">
                    <Play size={14} />
                    Schedule for Publishing
                  </button>
                  <button
                    onClick={() => { setStep('idle'); setReview(null); setPreviewScenes([]); setPreviewAudio(null); setEnhanced(''); setPrompt('') }}
                    className="px-4 py-3 border border-surface-border text-zinc-400 hover:text-white text-sm rounded-xl transition-colors"
                  >
                    New Video
                  </button>
                </div>
              )}

              {(review.decision === 'revise' || review.decision === 'regenerate') && (
                <button
                  onClick={generate}
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-sm font-medium py-3 rounded-xl transition-colors"
                >
                  <RefreshCw size={14} />
                  {review.decision === 'revise' ? 'Auto-Revise with Agent Feedback' : 'Regenerate from Scratch'}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
