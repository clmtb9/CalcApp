export const CALC_HISTORY_LIST_KEY = 'scientific-calculator-history-list'
export const MAX_RECENT_CALCULATIONS = 20
const DEFAULT_DECIMAL_PRECISION = 3

export interface RecentCalculation {
  expression: string
  resultMain: string
  resultSub: string
  resultNumeric: number | null
  resultFormat: 'decimal' | 'scientific'
  resultPrecision: number
  angleMode: 'deg' | 'rad'
  exactMode: boolean
  isError: boolean
  createdAt: string
}

function isRecentCalculation(value: unknown): value is RecentCalculation {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<RecentCalculation>
  return (
    typeof candidate.expression === 'string' &&
    typeof candidate.resultMain === 'string' &&
    typeof candidate.resultSub === 'string' &&
    (typeof candidate.resultNumeric === 'number' || candidate.resultNumeric === null || candidate.resultNumeric === undefined) &&
    (candidate.resultFormat === 'decimal' || candidate.resultFormat === 'scientific' || candidate.resultFormat === 'fixed' || candidate.resultFormat === undefined) &&
    (typeof candidate.resultPrecision === 'number' || candidate.resultPrecision === undefined) &&
    (candidate.angleMode === 'deg' || candidate.angleMode === 'rad') &&
    typeof candidate.exactMode === 'boolean' &&
    typeof candidate.isError === 'boolean' &&
    typeof candidate.createdAt === 'string'
  )
}

export function readRecentCalculations(): RecentCalculation[] {
  const raw = localStorage.getItem(CALC_HISTORY_LIST_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter(isRecentCalculation)
      .map((entry) => {
        const resultFormat: RecentCalculation['resultFormat'] = entry.resultFormat === 'scientific' ? 'scientific' : 'decimal'
        const resultPrecision =
          resultFormat === 'decimal'
            ? DEFAULT_DECIMAL_PRECISION
            : typeof entry.resultPrecision === 'number'
              ? entry.resultPrecision
              : DEFAULT_DECIMAL_PRECISION
        return {
          ...entry,
          resultNumeric: typeof entry.resultNumeric === 'number' ? entry.resultNumeric : null,
          resultFormat,
          resultPrecision,
        }
      })
      .slice(0, MAX_RECENT_CALCULATIONS)
  } catch {
    return []
  }
}

export function writeRecentCalculations(entries: RecentCalculation[]): void {
  localStorage.setItem(CALC_HISTORY_LIST_KEY, JSON.stringify(entries.slice(0, MAX_RECENT_CALCULATIONS)))
}
