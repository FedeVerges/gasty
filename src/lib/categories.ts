import type { Category } from '../types'

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'food', name: 'Comida', emoji: '🍔', color: '#f59e0b', type: 'expense',
    keywords: [
      'lomito', 'hamburguesa', 'pancho', 'choripan', 'helado', 'sushi',
      'pollo', 'carne', 'pescado', 'ensalada', 'fruta', 'verdura', 'kiosco',
      'almuerzo', 'cena', 'desayuno', 'merienda',
      'verdulería', 'verduleria', 'carnicería', 'carniceria',
      'panaderia', 'panadería',
    ],
  },
  {
    id: 'home', name: 'Vivienda', emoji: '🏠', color: '#8b5cf6', type: 'expense',
    keywords: [
      'alquiler', 'expensas', 'crédito hipotecario', 'credito hipotecario',
      'hipoteca',
    ],
  },
  {
    id: 'services', name: 'Servicios', emoji: '💡', color: '#06b6d4', type: 'expense',
    keywords: [
      'luz', 'gas', 'internet', 'agua', 'cable', 'celular',
      'teléfono', 'telefono',
    ],
  },
  {
    id: 'transport', name: 'Transporte', emoji: '🚗', color: '#3b82f6', type: 'expense',
    keywords: [
      'nafta', 'taxi', 'uber', 'sube', 'peaje', 'colectivo', 'subte',
      'estacionamiento', 'cuota auto', 'patente', 'seguro auto',
    ],
  },
  {
    id: 'leisure', name: 'Salidas', emoji: '🎉', color: '#ec4899', type: 'expense',
    keywords: [
      'birra', 'cerveza', 'pizza', 'empanada', 'empanadas',
      'restaurant', 'restaurante', 'café', 'cafe', 'bar',
      'recital', 'cine', 'teatro', 'boliche', 'viaje', 'salida', 'fiesta',
      'delivery', 'pedidosya', 'pedidos ya', 'rappi', 'uber eats',
      'netflix', 'spotify', 'disney', 'hbomax', 'hbo', 'prime',
    ],
  },
  {
    id: 'repair', name: 'Reparaciones', emoji: '🛠️', color: '#f97316', type: 'expense',
    keywords: [
      'arreglo', 'reparación', 'reparacion', 'instalación', 'instalacion',
      'termotanque', 'plomero', 'electricista', 'mecánico', 'mecanico',
    ],
  },
  {
    id: 'health', name: 'Salud', emoji: '💊', color: '#10b981', type: 'expense',
    keywords: [
      'farmacia', 'remedio', 'medicamento', 'médico', 'medico',
      'consulta', 'análisis', 'analisis', 'dentista', 'óptica', 'optica',
      'obra social', 'prepaga', 'mutual', 'seguro medico', 'seguro médico',
      'oftalmologo', 'oftalmólogo', 'psicologo', 'psicólogo',
      'kinesiologo', 'kinesiólogo',
    ],
  },
  {
    id: 'education', name: 'Educación', emoji: '📚', color: '#6366f1', type: 'expense',
    keywords: [
      'curso', 'libro', 'universidad', 'colegio', 'matrícula', 'matricula',
    ],
  },
  {
    id: 'supermarket', name: 'Supermercado', emoji: '🛒', color: '#22c55e', type: 'expense',
    keywords: [
      'super', 'supermercado', 'carrefour', 'disco', 'día', 'coto',
      'jumbo', 'chino', 'almacen', 'almacén',
    ],
  },
  {
    id: 'other_exp', name: 'Otros', emoji: '📦', color: '#64748b', type: 'expense',
    keywords: ['ropa', 'zapatillas', 'indumentaria'],
  },
  {
    id: 'salary', name: 'Sueldo', emoji: '💼', color: '#22c55e', type: 'income',
    keywords: [
      'sueldo', 'salario', 'sueldo básico', 'sueldo basico', 'sueldo neto',
      'aguinaldo', 'bonificación', 'bonificacion', 'bono',
    ],
  },
  {
    id: 'other_inc', name: 'Otros ingresos', emoji: '💰', color: '#10b981', type: 'income',
    keywords: [
      'honorarios', 'venta', 'cobro', 'cobré', 'freelance', 'facturé',
      'recibí', 'ingreso', 'pago recibido', 'devolución', 'devolucion',
      'transferencia recibida', 'comisión', 'comision', 'propina',
      'dividendo', 'interés cobrado', 'interes cobrado', 'ganancia',
      'alquiler cobrado', 'alquiler recibido',
    ],
  },
]

// ── Dynamic lookup maps (mutated by syncKeywordMaps) ──

export let KEYWORDS: Array<[string, string]> = []
export let INCOME_KEYWORDS: string[] = []
export const RECURRING_KEYWORDS: string[] = [
  'alquiler', 'expensas', 'cuota', 'crédito', 'credito', 'servicio',
  'suscripcion', 'suscripción', 'patente', 'seguro', 'impuesto',
  'sueldo', 'salario',
]

// Initialize from defaults
syncKeywordMaps(DEFAULT_CATEGORIES)

export function syncKeywordMaps(categories: Category[]): void {
  const kw: Array<[string, string]> = []
  const income: string[] = []

  for (const cat of categories) {
    for (const word of cat.keywords) {
      kw.push([word, cat.id])
      if (cat.type === 'income') {
        income.push(word)
      }
    }
  }

  KEYWORDS = kw
  INCOME_KEYWORDS = income
}
