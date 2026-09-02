import { useState } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { useProfile } from '../../context/ProfileContext'

const COLORS = [
  'var(--color-primary)',
  'var(--color-accent-cyan)',
  'var(--color-accent-orange)',
  'var(--color-positive)',
  'var(--color-warning)',
  'var(--color-negative)',
]

export function ProfileManager() {
  const { profile, profiles, addProfile, editProfile, removeProfile } = useProfile()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📁')
  const [color, setColor] = useState(COLORS[0])
  const [error, setError] = useState('')

  const reset = () => {
    setAdding(false)
    setEditingId(null)
    setName('')
    setEmoji('📁')
    setColor(COLORS[0])
    setError('')
  }

  const beginEdit = (item: typeof profiles[number]) => {
    setAdding(false)
    setEditingId(item.id)
    setName(item.name)
    setEmoji(item.emoji)
    setColor(item.color)
    setError('')
  }

  const save = async () => {
    const cleanName = name.trim()
    if (!cleanName) {
      setError('Escribí un nombre para el perfil.')
      return
    }
    if (profiles.some((item) => item.id !== editingId && item.name.trim().toLocaleLowerCase() === cleanName.toLocaleLowerCase())) {
      setError('Ya existe un perfil con ese nombre.')
      return
    }
    if (editingId) await editProfile(editingId, { name: cleanName, emoji: emoji || '📁', color })
    else await addProfile({ name: cleanName, emoji: emoji || '📁', color })
    reset()
  }

  const remove = async (id: string) => {
    const item = profiles.find((candidate) => candidate.id === id)
    if (!item || profiles.length === 1) return
    if (!confirm(`¿Eliminar el perfil “${item.name}” y todos sus datos? Esta acción no se puede deshacer.`)) return
    await removeProfile(id)
    if (editingId === id) reset()
  }

  return (
    <Card>
      <span className="mb-3 block text-xs font-medium uppercase tracking-widest text-body">Tus perfiles</span>
      <p className="mb-3 text-xs text-body">Cada perfil guarda sus propios movimientos, categorías, recurrentes, inversiones y moneda.</p>

      <div className="space-y-2">
        {profiles.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-canvas-soft p-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl text-lg" style={{ background: `color-mix(in srgb, ${item.color} 22%, transparent)` }}>{item.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{item.name}</p>
              <p className="text-xs text-mute">{item.id === profile?.id ? 'Perfil actual' : item.currency}</p>
            </div>
            <button onClick={() => beginEdit(item)} className="text-xs font-medium text-primary">Editar</button>
            {profiles.length > 1 && (
              <button onClick={() => void remove(item.id)} className="text-xs text-negative" aria-label={`Eliminar ${item.name}`}>Eliminar</button>
            )}
          </div>
        ))}
      </div>

      {(adding || editingId) ? (
        <div className="mt-3 space-y-3 rounded-2xl bg-canvas-soft p-3">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre del perfil" className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-primary" autoFocus />
          <div className="flex items-center gap-2">
            <input value={emoji} onChange={(event) => setEmoji(event.target.value)} maxLength={4} aria-label="Ícono del perfil" className="w-14 rounded-xl border border-border bg-card px-2 py-2 text-center text-lg" />
            <div className="flex flex-1 justify-between gap-1">
              {COLORS.map((option) => (
                <button key={option} onClick={() => setColor(option)} className={`h-8 w-8 rounded-full border-2 ${color === option ? 'border-ink' : 'border-transparent'}`} style={{ background: option }} aria-label="Elegir color" />
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-negative">{error}</p>}
          <div className="flex gap-2">
            <Button fullWidth onClick={() => void save()}>{editingId ? 'Guardar cambios' : 'Crear perfil'}</Button>
            <Button variant="tertiary" onClick={reset}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="mt-3 w-full rounded-2xl border-2 border-dashed border-border-soft py-3 text-sm font-medium text-body active:scale-[0.98]">
          + Agregar perfil
        </button>
      )}
    </Card>
  )
}
