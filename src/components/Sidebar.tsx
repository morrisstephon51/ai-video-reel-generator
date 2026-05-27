'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles, Video, LayoutDashboard, Settings, Zap, BarChart2 } from 'lucide-react'
import clsx from 'clsx'

const nav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/generate',  icon: Sparkles,        label: 'Generate'  },
  { href: '/library',   icon: Video,           label: 'Library'   },
  { href: '/analytics', icon: BarChart2,       label: 'Analytics' },
  { href: '/agents',    icon: Zap,             label: 'Agents'    },
  { href: '/settings',  icon: Settings,        label: 'Settings'  },
]

export default function Sidebar() {
  const path = usePathname()
  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-surface-card border-r border-surface-border flex flex-col z-40">
      <div className="px-4 py-5 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="font-bold text-sm text-white">ContentEngine</span>
        </div>
        <p className="text-[10px] text-zinc-500 mt-0.5 ml-9">Autonomous AI</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              path === href || path.startsWith(href + '/')
                ? 'bg-brand-500/10 text-brand-400 font-medium'
                : 'text-zinc-400 hover:text-white hover:bg-surface-hover'
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-surface-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-zinc-500">Autonomous mode active</span>
        </div>
      </div>
    </aside>
  )
}
