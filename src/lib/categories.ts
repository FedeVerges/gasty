import type { Category } from '../types'

// ── Chart palette: 30 well-distinct colors ──
// All default and new categories draw from this palette to ensure every
// category has a unique color that stays consistent across all screens.
export const CHART_COLORS: string[] = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#469990', '#dcbeff', '#9a6324', '#ff7bac', '#800000',
  '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9',
  '#e6beff', '#46f0f0', '#f5a623', '#7ed321', '#50e3c2',
  '#b8e986', '#d0021b', '#f8e71c', '#6b5b95', '#e94b3c',
]

/**
 * Returns a deterministic color from the chart palette based on position.
 * Used to assign unique colors to new categories.
 */
export function getPaletteColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]
}

const C = (i: number) => CHART_COLORS[i]

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'food', name: 'Comida', emoji: '🍔', color: C(0), type: 'expense',
    keywords: [
      'lomito', 'hamburguesa', 'pancho', 'choripan', 'helado', 'sushi',
      'pollo', 'carne', 'pescado', 'ensalada', 'fruta', 'verdura', 'kiosco',
      'almuerzo', 'cena', 'desayuno', 'merienda',
      'verdulería', 'verduleria', 'carnicería', 'carniceria',
      'panaderia', 'panadería',
    ],
  },
  {
    id: 'home', name: 'Vivienda', emoji: '🏠', color: C(1), type: 'expense',
    keywords: [
      'alquiler', 'expensas', 'crédito hipotecario', 'credito hipotecario',
      'hipoteca',
    ],
  },
  {
    id: 'services', name: 'Servicios', emoji: '💡', color: C(2), type: 'expense',
    keywords: [
      'luz', 'gas', 'internet', 'agua', 'cable', 'celular',
      'teléfono', 'telefono',
    ],
  },
  {
    id: 'transport', name: 'Transporte', emoji: '🚗', color: C(3), type: 'expense',
    keywords: [
      'nafta', 'taxi', 'uber', 'sube', 'peaje', 'colectivo', 'subte',
      'estacionamiento', 'cuota auto', 'patente', 'seguro auto',
    ],
  },
  {
    id: 'leisure', name: 'Salidas', emoji: '🎉', color: C(4), type: 'expense',
    keywords: [
      'birra', 'cerveza', 'pizza', 'empanada', 'empanadas',
      'restaurant', 'restaurante', 'café', 'cafe', 'bar',
      'recital', 'cine', 'teatro', 'boliche', 'viaje', 'salida', 'fiesta',
      'delivery', 'pedidosya', 'pedidos ya', 'rappi', 'uber eats',
      'netflix', 'spotify', 'disney', 'hbomax', 'hbo', 'prime',
    ],
  },
  {
    id: 'repair', name: 'Reparaciones', emoji: '🛠️', color: C(5), type: 'expense',
    keywords: [
      'arreglo', 'reparación', 'reparacion', 'instalación', 'instalacion',
      'termotanque', 'plomero', 'electricista', 'mecánico', 'mecanico',
    ],
  },
  {
    id: 'health', name: 'Salud', emoji: '💊', color: C(6), type: 'expense',
    keywords: [
      'farmacia', 'remedio', 'medicamento', 'médico', 'medico',
      'consulta', 'análisis', 'analisis', 'dentista', 'óptica', 'optica',
      'obra social', 'prepaga', 'mutual', 'seguro medico', 'seguro médico',
      'oftalmologo', 'oftalmólogo', 'psicologo', 'psicólogo',
      'kinesiologo', 'kinesiólogo',
    ],
  },
  {
    id: 'education', name: 'Educación', emoji: '📚', color: C(7), type: 'expense',
    keywords: [
      'curso', 'libro', 'universidad', 'colegio', 'matrícula', 'matricula',
    ],
  },
  {
    id: 'supermarket', name: 'Supermercado', emoji: '🛒', color: C(8), type: 'expense',
    keywords: [
      'super', 'supermercado', 'carrefour', 'disco', 'día', 'coto',
      'jumbo', 'chino', 'almacen', 'almacén',
    ],
  },
  {
    id: 'other_exp', name: 'Otros', emoji: '📦', color: C(9), type: 'expense',
    keywords: ['ropa', 'zapatillas', 'indumentaria'],
  },
  {
    id: 'salary', name: 'Sueldo', emoji: '💼', color: C(10), type: 'income',
    keywords: [
      'sueldo', 'salario', 'sueldo básico', 'sueldo basico', 'sueldo neto',
      'aguinaldo', 'bonificación', 'bonificacion', 'bono',
    ],
  },
  {
    id: 'other_inc', name: 'Otros ingresos', emoji: '💰', color: C(11), type: 'income',
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
