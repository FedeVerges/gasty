/**
 * Gasty Flash — contextual input suggestions.
 *
 * Returns a list of suggested transaction strings based on:
 * - Time of day (mañana → café, mediodía → almuerzo, etc.)
 * - Day of month (1-10 → alquiler, expensas, servicios)
 * - Day of week (finde → salidas/delivery)
 */

export interface FlashSuggestion {
  /** The text to inject into the input field */
  text: string
  /** Short label to display on the chip */
  label: string
  /** Emoji icon */
  emoji: string
}

function getHour(): number {
  return new Date().getHours()
}

function getDay(): number {
  return new Date().getDate()
}

function getDayOfWeek(): number {
  return new Date().getDay() // 0=Sun, 6=Sat
}

/**
 * Pure function: returns contextual suggestions based on current time.
 * Deterministic for testing — pass `now` to override.
 */
export function getFlashSuggestions(now?: Date): FlashSuggestion[] {
  const hour = now ? now.getHours() : getHour()
  const day = now ? now.getDate() : getDay()
  const dow = now ? now.getDay() : getDayOfWeek()
  const isWeekend = dow === 0 || dow === 6
  const isEarlyMonth = day <= 10
  const isMidMonth = day > 10 && day <= 20
  const isLateMonth = day > 20

  const suggestions: FlashSuggestion[] = []

  // ── Time-of-day contextual suggestions ──
  if (hour >= 6 && hour < 9) {
    // Early morning
    suggestions.push({ text: 'cafe 1500', label: 'Café', emoji: '☕' })
    suggestions.push({ text: 'desayuno 2000', label: 'Desayuno', emoji: '🥐' })
  } else if (hour >= 9 && hour < 12) {
    // Late morning
    suggestions.push({ text: 'cafe 1500', label: 'Café', emoji: '☕' })
    suggestions.push({ text: 'kiosco 1000', label: 'Kiosco', emoji: '🍬' })
  } else if (hour >= 12 && hour < 14) {
    // Lunch
    suggestions.push({ text: 'almuerzo 5000', label: 'Almuerzo', emoji: '🍝' })
    suggestions.push({ text: 'menu 4500', label: 'Menú', emoji: '🍽️' })
  } else if (hour >= 14 && hour < 17) {
    // Afternoon
    suggestions.push({ text: 'cafe 1500', label: 'Café', emoji: '☕' })
    suggestions.push({ text: 'merienda 2000', label: 'Merienda', emoji: '🧁' })
  } else if (hour >= 17 && hour < 20) {
    // Late afternoon / early evening
    suggestions.push({ text: 'super 5000', label: 'Super', emoji: '🛒' })
    suggestions.push({ text: 'almacen 2000', label: 'Almacén', emoji: '🏪' })
  } else if (hour >= 20 && hour < 23) {
    // Dinner / night
    suggestions.push({ text: 'cena 5000', label: 'Cena', emoji: '🍕' })
    suggestions.push({ text: 'birra 1500', label: 'Birra', emoji: '🍺' })
  } else {
    // Late night
    suggestions.push({ text: 'delivery 5000', label: 'Delivery', emoji: '📦' })
    suggestions.push({ text: 'kiosco 1000', label: 'Kiosco', emoji: '🍬' })
  }

  // ── Weekend-specific ──
  if (isWeekend) {
    suggestions.push({ text: 'birra 2000', label: 'Salida', emoji: '🎉' })
    if (hour >= 12 && hour < 17) {
      suggestions.push({ text: 'almuerzo 6000', label: 'Almuerzo finde', emoji: '🍖' })
    }
  }

  // ── Day-of-month expense patterns ──
  if (isEarlyMonth) {
    suggestions.push({ text: 'alquiler 45000', label: 'Alquiler', emoji: '🏠' })
    suggestions.push({ text: 'expensas 10000', label: 'Expensas', emoji: '🏢' })
    suggestions.push({ text: 'internet 5000', label: 'Internet', emoji: '🌐' })
    suggestions.push({ text: 'luz 3000', label: 'Luz', emoji: '💡' })
  } else if (isMidMonth) {
    suggestions.push({ text: 'celular 5000', label: 'Celular', emoji: '📱' })
    suggestions.push({ text: 'gas 2500', label: 'Gas', emoji: '🔥' })
  } else if (isLateMonth) {
    suggestions.push({ text: 'super 8000', label: 'Super', emoji: '🛒' })
    suggestions.push({ text: 'nafta 15000', label: 'Nafta', emoji: '⛽' })
  }

  // ── Always include income suggestion ──
  suggestions.push({ text: 'sueldo 150000', label: 'Sueldo', emoji: '💼' })

  return suggestions
}
