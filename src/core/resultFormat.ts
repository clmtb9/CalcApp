import type { ResultDisplayFormat } from '../state/types'

const SCIENTIFIC_AUTO_MIN = 1e-6
const SCIENTIFIC_AUTO_MAX = 1e9

function normalizeMinusZero(value: number): number {
  return Object.is(value, -0) ? 0 : value
}

function trimTrailingZeros(value: string): string {
  if (!value.includes('.')) {
    return value
  }
  return value.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
}

function formatDecimal(value: number, precision: number): string {
  const normalized = normalizeMinusZero(value)
  const rounded = Number(normalized.toFixed(precision))
  return trimTrailingZeros(rounded.toString())
}

function shouldUseScientific(abs: number): boolean {
  return abs > 0 && (abs < SCIENTIFIC_AUTO_MIN || abs >= SCIENTIFIC_AUTO_MAX)
}

function formatScientificAuto(value: number): string {
  const normalized = normalizeMinusZero(value)
  const abs = Math.abs(normalized)
  if (!shouldUseScientific(abs)) {
    // Keep a compact decimal representation when scientific notation is not needed.
    return trimTrailingZeros(normalized.toString())
  }

  // Auto-select useful mantissa decimals, then trim trailing zeros.
  const [mantissa, exponent] = normalized.toExponential(14).split('e')
  return `${trimTrailingZeros(mantissa)}e${exponent}`
}

export function formatEngineeringNumber(value: number, format: ResultDisplayFormat, precision: number): string {
  if (!Number.isFinite(value)) {
    return 'Indefini'
  }

  switch (format) {
    case 'scientific':
      return formatScientificAuto(value)
    case 'decimal':
    default:
      return formatDecimal(value, precision)
  }
}
