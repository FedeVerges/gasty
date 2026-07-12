import { useState } from 'react'
import { db } from '../../lib/db'
import { syncKeywordMaps, getPaletteColor } from '../../lib/categories'
import { useCategories } from '../../hooks/useCategories'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import type { CategoryType } from '../../types'

const DEFAULT_IDS = new Set([
  'food', 'home', 'services', 'transport', 'leisure', 'repair',
  'health', 'education', 'supermarket', 'other_exp', 'salary', 'other_inc',
])

let _catColorIndex = 0

export function CategoryManager() {
  const categories = useCategories()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('📦')
  const [newType, setNewType] = useState<CategoryType>('expense')
  const [keywordInput, setKeywordInput] = useState('')

  const isDefault = (id: string) => DEFAULT_IDS.has(id)

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría? Las transacciones existentes no se modificarán.')) return
    await db.categories.delete(id)
    const remaining = await db.categories.toArray()
    syncKeywordMaps(remaining)
  }

  const addCategory = async () => {
    const name = newName.trim()
    if (!name) return
    const id = name.toLowerCase().replace(/\s+/g, '_')
    const colorIndex = _catColorIndex++
    await db.categories.add({
      id,
      name,
      emoji: newEmoji,
      color: getPaletteColor(colorIndex),
      type: newType,
      keywords: [],
    })
    setNewName('')
    setAdding(false)
    const cats = await db.categories.toArray()
    syncKeywordMaps(cats)
  }

  const addKeyword = async (catId: string) => {
    const kw = keywordInput.trim().toLowerCase()
    if (!kw) return
    const cat = categories.find(c => c.id === catId)
    if (!cat || cat.keywords.includes(kw)) return
    const updated = { ...cat, keywords: [...cat.keywords, kw] }
    await db.categories.put(updated)
    setKeywordInput('')
    const cats = await db.categories.toArray()
    syncKeywordMaps(cats)
  }

  const removeKeyword = async (catId: string, kw: string) => {
    const cat = categories.find(c => c.id === catId)
    if (!cat) return
    const updated = { ...cat, keywords: cat.keywords.filter(k => k !== kw) }
    await db.categories.put(updated)
    const cats = await db.categories.toArray()
    syncKeywordMaps(cats)
  }

  const saveEmoji = async (catId: string, emoji: string) => {
    const cat = categories.find(c => c.id === catId)
    if (!cat) return
    await db.categories.put({ ...cat, emoji })
  }

  return (
    <Card>
      <span className="text-xs uppercase tracking-widest text-body font-medium block mb-3">
        Categorías y palabras clave
      </span>
      <p className="text-xs text-body mb-3">
        Las palabras clave se usan para detectar automáticamente la categoría al escribir un gasto.
      </p>

      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id} className="rounded-2xl bg-canvas-soft overflow-hidden">
            <button
              onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)}
              className="w-full flex items-center gap-3 p-3 text-left"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: `${cat.color}25` }}
              >
                {cat.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-ink truncate">{cat.name}</p>
                <p className="text-xs text-mute">{cat.keywords.length} palabras clave</p>
              </div>
              <Badge color={cat.type === 'income' ? 'income' : 'expense'}>
                {cat.type === 'income' ? 'Ingreso' : 'Gasto'}
              </Badge>
              <span className="text-mute text-sm ml-1">{expandedId === cat.id ? '▲' : '▼'}</span>
            </button>

            {expandedId === cat.id && (
              <div className="px-3 pb-3 border-t border-border pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-mute">Emoji</span>
                  <input
                    value={cat.emoji}
                    onChange={(e) => saveEmoji(cat.id, e.target.value)}
                    placeholder="📦"
                    maxLength={4}
                    className="w-14 px-2 py-2 text-lg rounded-xl bg-canvas border border-border text-center outline-none focus:border-primary transition-colors"
                    aria-label={`Emoji de ${cat.name}`}
                  />
                </div>

                <div className="flex flex-wrap gap-1 mb-2">
                  {cat.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-canvas text-body border border-border"
                    >
                      {kw}
                      <button
                        onClick={() => removeKeyword(cat.id, kw)}
                        className="text-mute hover:text-negative ml-0.5 leading-none"
                        aria-label={`Eliminar ${kw}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-1">
                  <input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addKeyword(cat.id)
                    }}
                    placeholder="nueva palabra clave..."
                    className="flex-1 px-3 py-2 text-sm rounded-xl bg-canvas border border-border text-ink outline-none focus:border-primary transition-colors"
                  />
                  <button
                    onClick={() => addKeyword(cat.id)}
                    className="px-3 py-2 text-sm font-semibold rounded-xl bg-primary text-on-primary"
                  >
                    +
                  </button>
                </div>

                {!isDefault(cat.id) && (
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="mt-2 text-xs text-negative"
                  >
                    Eliminar categoría
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <div className="mt-3 p-3 rounded-2xl bg-canvas-soft space-y-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre de la categoría"
            className="w-full px-3 py-2 text-sm rounded-xl bg-canvas border border-border text-ink outline-none focus:border-primary transition-colors"
          />
          <div className="flex gap-2">
            <input
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              placeholder="📦"
              className="w-14 px-2 py-2 text-sm rounded-xl bg-canvas border border-border text-center outline-none focus:border-primary transition-colors"
            />
            <div className="flex gap-1">
              <button
                onClick={() => setNewType('expense')}
                className={`px-3 py-2 text-xs font-medium rounded-xl ${newType === 'expense' ? 'bg-expense-soft text-expense' : 'bg-canvas text-body border border-border'}`}
              >
                Gasto
              </button>
              <button
                onClick={() => setNewType('income')}
                className={`px-3 py-2 text-xs font-medium rounded-xl ${newType === 'income' ? 'bg-income-soft text-income' : 'bg-canvas text-body border border-border'}`}
              >
                Ingreso
              </button>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={addCategory}
              className="flex-1 py-2 text-sm font-semibold rounded-xl bg-primary text-on-primary"
            >
              Agregar
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-canvas text-body border border-border"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 w-full py-3 rounded-2xl border-2 border-dashed border-border text-body text-sm font-medium active:scale-[0.98] transition-transform"
        >
          + Agregar categoría
        </button>
      )}
    </Card>
  )
}
