import Sidebar from '@/components/Sidebar'
import { Zap, TrendingUp, Eye, Star, Target, ShieldCheck, BarChart2, Hash, Link2, RefreshCw, Layers, Brain } from 'lucide-react'

const REVIEW_AGENTS = [
  { key: 'viral',      label: 'Viral Potential',    role: 'Creative Director',    icon: TrendingUp,  color: 'text-pink-400',   bg: 'bg-pink-500/10 border-pink-500/20',   desc: 'Scores hook strength, curiosity gap, emotional triggers, and share-worthiness.' },
  { key: 'design',     label: 'Design Quality',     role: 'Visual Designer',      icon: Eye,         color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   desc: 'Evaluates visual consistency, typography, contrast ratio, and thumbnail appeal.' },
  { key: 'ux',         label: 'UX / Pacing',        role: 'UX Lead',             icon: Layers,      color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/20',   desc: 'Reviews CTA placement, caption sync, scene pacing, and mobile readability.' },
  { key: 'brand',      label: 'Brand Voice',        role: 'Brand Manager',        icon: Star,        color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', desc: 'Checks tone consistency, hook pattern alignment, vocabulary, and CTA clarity.' },
  { key: 'strategy',   label: 'Content Strategy',   role: 'Content Strategist',   icon: Target,      color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20', desc: 'Assesses hashtag quality, niche alignment, growth angle, and funnel stage fit.' },
  { key: 'compliance', label: 'Platform Compliance', role: 'QA / Platform Ops',  icon: ShieldCheck, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', desc: 'Verifies duration limits, caption character counts, hashtag counts, and community guidelines.' },
]

const SPECIALIST_AGENTS = [
  { label: 'Hook Optimizer',        icon: Zap,       color: 'text-orange-400', desc: 'Rewrites the opening 3 seconds for maximum scroll-stopping power.' },
  { label: 'Caption Optimizer',     icon: Brain,     color: 'text-blue-400',   desc: 'Refines on-screen text for clarity, impact, and mobile readability.' },
  { label: 'Hashtag Research',      icon: Hash,      color: 'text-green-400',  desc: 'Finds optimal hashtag mixes — niche, trending, and branded.' },
  { label: 'SEO Agent',             icon: Link2,     color: 'text-cyan-400',   desc: 'Optimizes titles, descriptions, and metadata for search discoverability.' },
  { label: 'Trend Intelligence',    icon: TrendingUp, color: 'text-pink-400',  desc: 'Monitors real-time platform trends and injects them into content.' },
  { label: 'Content Repurposer',    icon: RefreshCw, color: 'text-yellow-400', desc: 'Adapts a single video into formats for TikTok, Reels, Shorts, and LinkedIn.' },
  { label: 'Performance Predictor', icon: BarChart2, color: 'text-purple-400', desc: 'Estimates reach, engagement rate, and saves before publishing.' },
  { label: 'Thumbnail Agent',       icon: Eye,       color: 'text-red-400',    desc: 'Generates and scores thumbnail variants for click-through optimization.' },
  { label: 'AB Tester',             icon: Layers,    color: 'text-brand-400',  desc: 'Creates variant hooks and captions to split-test against each other.' },
  { label: 'Self-Improver',         icon: Star,      color: 'text-emerald-400', desc: 'Learns from review outcomes and tunes generation parameters over time.' },
]

export default function AgentsPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Agents</h1>
            <p className="text-zinc-500 text-sm mt-1">16 AI agents powering your autonomous content engine</p>
          </div>

          {/* Review Council */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={16} className="text-brand-400" />
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">6-Agent Review Council</h2>
              <span className="text-xs text-zinc-600 ml-1">— runs on every generation</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {REVIEW_AGENTS.map(({ key, label, role, icon: Icon, color, bg, desc }) => (
                <div key={key} className={`border rounded-xl p-4 ${bg}`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${color}`}><Icon size={18} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white">{label}</p>
                        <span className="text-[10px] text-zinc-500 shrink-0">{role}</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Specialist Agents */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-brand-400" />
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">10 Specialist Agents</h2>
              <span className="text-xs text-zinc-600 ml-1">— optimization layer</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SPECIALIST_AGENTS.map(({ label, icon: Icon, color, desc }) => (
                <div key={label} className="bg-surface-card border border-surface-border rounded-xl p-4 flex items-start gap-3">
                  <div className={`mt-0.5 ${color}`}><Icon size={16} /></div>
                  <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
