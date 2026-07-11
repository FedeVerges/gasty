import type { Tab } from '../../types'

interface SidebarProps {
  active: Tab
  onChange: (tab: Tab) => void
  isWide?: boolean
}

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Inicio', icon: 'home' },
  { id: 'transactions', label: 'Movimientos', icon: 'list' },
  { id: 'stats', label: 'Stats', icon: 'chart' },
  { id: 'settings', label: 'Ajustes', icon: 'gear' },
]

function Icon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (name) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <path d="M3 12l9-9 9 9" />
          <path d="M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10" />
        </svg>
      )
    case 'list':
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <circle cx="4" cy="6" r="1" fill="currentColor" />
          <circle cx="4" cy="12" r="1" fill="currentColor" />
          <circle cx="4" cy="18" r="1" fill="currentColor" />
        </svg>
      )
    case 'chart':
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <path d="M3 3v18h18" />
          <rect x="7" y="12" width="3" height="6" />
          <rect x="12" y="8" width="3" height="10" />
          <rect x="17" y="4" width="3" height="14" />
        </svg>
      )
    case 'gear':
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      )
    default:
      return null
  }
}

export function Sidebar({ active, onChange, isWide }: SidebarProps) {
  return (
    <aside
      className={`
        hidden md:flex
        flex-col
        shrink-0
        bg-canvas border-r border-border
        py-6
        h-full
        ${isWide ? 'w-64 px-4' : 'w-56 px-3'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2.5 px-3 ${isWide ? 'mb-10' : 'mb-8'}`}>
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
          <span className="text-on-primary font-bold text-sm">$</span>
        </div>
        <span className="text-xl font-black text-ink tracking-tight">Gasty</span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1">
        {TABS.map((tab) => {
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                flex items-center gap-3
                px-3 py-2.5 rounded-xl
                text-sm font-medium
                transition-colors
                ${isActive
                  ? 'bg-primary-pale text-ink'
                  : 'text-mute hover:bg-canvas-soft hover:text-ink'
                }
              `}
            >
              <Icon name={tab.icon} className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
