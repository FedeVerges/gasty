import { useState } from 'react'
import { Card } from '../ui/Card'
import { useSettings } from '../../context/SettingsContext'
import { useInvestments, useSavingsTotal } from '../../hooks/useInvestments'
import { db, generateId } from '../../lib/db'
import { formatMoney } from '../../lib/format'

const MONTHS = 12

export function Inversiones() {
  const { settings } = useSettings()
  const investments = useInvestments()
  const totalSaved = useSavingsTotal()

  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📈')
  const [allocationPct, setAllocationPct] = useState(50)
  const [monthlyReturnPct, setMonthlyReturnPct] = useState(1)

  const totalAllocated = investments.reduce((acc, i) => acc + i.allocationPct, 0)

  // Projected portfolio value per month (compound monthly on the allocated lump sum)
  const projection = Array.from({ length: MONTHS + 1 }, (_, m) =>
    investments.reduce((acc, inv) => {
      const allocated = (totalSaved * inv.allocationPct) / 100
      return acc + allocated * Math.pow(1 + inv.monthlyReturnPct / 100, m)
    }, 0),
  )
  const finalValue = projection[MONTHS]
  const maxValue = Math.max(finalValue, totalSaved, 1)

  const addInvestment = async () => {
    const n = name.trim()
    if (!n) return
    await db.investments.add({
      id: generateId(),
      name: n,
      emoji,
      allocationPct: Math.max(0, Math.min(100, allocationPct)),
      monthlyReturnPct,
    })
    setName('')
    setEmoji('📈')
    setAllocationPct(50)
    setMonthlyReturnPct(1)
    setAdding(false)
  }

  const removeInvestment = async (id: string) => {
    if (!confirm('¿Eliminar este destino de inversión?')) return
    await db.investments.delete(id)
  }

  // SVG projection (area chart)
  const W = 320
  const H = 140
  const PAD = 8
  const stepX = (W - PAD * 2) / MONTHS
  const points = projection.map((v, i) => {
    const x = PAD + i * stepX
    const y = H - PAD - (v / maxValue) * (H - PAD * 2)
    return `${x},${y}`
  })
  const areaPath = `M ${PAD},${H - PAD} L ${points.join(' L ')} L ${W - PAD},${H - PAD} Z`

  return (
    <div className="space-y-4">
      <header className="pt-2 pb-1">
        <h2 className="text-3xl font-black tracking-tight leading-none">Inversiones</h2>
        <p className="text-sm text-body mt-2">
          Distribuí tus ahorros en destinos y proyectá su crecimiento.
        </p>
      </header>

      <Card variant="dark">
        <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-primary-neutral)' }}>
          Total ahorrado disponible
        </span>
        <span className="block text-4xl font-bold tracking-tight text-primary mt-1">
          {formatMoney(totalSaved, settings.currency)}
        </span>
        <p className="text-xs text-body mt-2">
          Suma de todos tus movimientos en la categoría Ahorros.
        </p>
      </Card>

      {investments.length > 0 && (
        <Card>
          <span className="text-xs uppercase tracking-widest text-body font-medium block mb-3">
            Proyección a {MONTHS} meses
          </span>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-bold text-ink">
              {formatMoney(finalValue, settings.currency)}
            </span>
            {finalValue > totalSaved && (
              <span className="text-sm font-medium text-positive">
                +{formatMoney(finalValue - totalSaved, settings.currency)}
              </span>
            )}
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
            <path d={areaPath} fill="var(--color-primary)" opacity={0.18} />
            <polyline
              points={points.join(' ')}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </Card>
      )}

      <div className="space-y-2">
        {investments.map((inv) => {
          const allocated = (totalSaved * inv.allocationPct) / 100
          const projected = allocated * Math.pow(1 + inv.monthlyReturnPct / 100, MONTHS)
          return (
            <div key={inv.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 bg-canvas-soft">
                  {inv.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate">{inv.name}</p>
                  <p className="text-xs text-body">
                    {inv.allocationPct}% · {inv.monthlyReturnPct}% mensual
                  </p>
                </div>
                <button
                  onClick={() => removeInvestment(inv.id)}
                  className="text-xs text-negative"
                  aria-label={`Eliminar ${inv.name}`}
                >
                  Eliminar
                </button>
              </div>
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-body">Asignado: {formatMoney(allocated, settings.currency)}</span>
                <span className="text-positive">Proy.: {formatMoney(projected, settings.currency)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {totalAllocated > 100 && (
        <p className="text-xs text-warning text-center">
          La suma de asignaciones supera el 100% ({totalAllocated}%).
        </p>
      )}

      {adding ? (
        <div className="p-4 rounded-2xl bg-canvas-soft space-y-3">
          <div className="flex gap-2">
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              maxLength={4}
              className="w-14 px-2 py-2 text-lg rounded-xl bg-canvas border border-border text-center outline-none focus:border-primary"
              aria-label="Emoji"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Acciones"
              className="flex-1 px-3 py-2 text-sm rounded-xl bg-canvas border border-border text-ink outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-mute w-24">Asignación %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={allocationPct}
              onChange={(e) => setAllocationPct(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
              className="flex-1 px-3 py-2 rounded-xl bg-canvas border border-border text-center"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-mute w-24">Retorno %/mes</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={monthlyReturnPct}
              onChange={(e) => setMonthlyReturnPct(parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 rounded-xl bg-canvas border border-border text-center"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={addInvestment}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-primary text-on-primary"
            >
              Agregar
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-canvas text-body border border-border"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-border text-body text-sm font-medium active:scale-[0.98] transition-transform"
        >
          + Agregar destino de inversión
        </button>
      )}
    </div>
  )
}
