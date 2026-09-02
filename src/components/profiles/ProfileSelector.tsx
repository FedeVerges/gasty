import { useState } from 'react'
import { useProfile } from '../../context/ProfileContext'

export function ProfileSelector() {
  const { profile, profiles, selectProfile } = useProfile()
  const [open, setOpen] = useState(false)

  if (!profile) return null

  const choose = async (id: string) => {
    await selectProfile(id)
    setOpen(false)
  }

  return (
    <div className="relative z-30">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-1 text-left shadow-sm active:scale-[0.99]"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl text-lg" style={{ background: `color-mix(in srgb, ${profile.color} 22%, transparent)` }}>
          {profile.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-ink">{profile.name}</span>
        </span>
        <span className="px-2 text-sm text-mute">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] overflow-hidden rounded-2xl border border-border bg-card p-1 shadow-xl" role="listbox" aria-label="Elegir perfil">
          {profiles.map((item) => (
            <button
              key={item.id}
              onClick={() => void choose(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left ${item.id === profile.id ? 'bg-canvas-soft' : 'hover:bg-canvas-soft'}`}
              role="option"
              aria-selected={item.id === profile.id}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl text-base" style={{ background: `color-mix(in srgb, ${item.color} 22%, transparent)` }}>{item.emoji}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{item.name}</span>
              {item.id === profile.id && <span className="text-primary">✓</span>}
            </button>
          ))}
          <button
            onClick={() => { setOpen(false); window.location.hash = '#/settings?view=profiles' }}
            className="mt-1 w-full border-t border-border px-3 py-3 text-left text-sm font-semibold text-primary"
          >
            Administrar perfiles
          </button>
        </div>
      )}
    </div>
  )
}
