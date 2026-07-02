import { load } from 'js-yaml'
import specYamlRaw from '../../SPEC_CALCULATRICE_SCIENTIFIQUE_PWA.yaml?raw'

export type AngleMode = 'deg' | 'rad'

export interface CalcSpec {
  spec: {
    id: string
    version: string
    source_reference: string
    objective: string[]
  }
  state: {
    exactMode: { default: boolean }
    angleMode: { default: AngleMode }
  }
  layout: {
    root: {
      bottom_space_px: number
    }
    keypad: {
      rows: number
      cols: number
      horizontal_gap_px: number
      vertical_gap_px: number
    }
  }
  palette: Record<string, string>
  keypad_map: string[][]
  shift_mapping: Record<string, string | boolean>
  keyboard_physical: {
    char_events: {
      allowed_direct: string
      shortcuts: Record<string, string>
    }
  }
  history: {
    autosave: {
      debounce_ms: number
    }
  }
  acceptance_criteria: string[]
}

function parseSpec(): CalcSpec {
  const parsed = load(specYamlRaw)
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('SPEC YAML invalide: racine absente.')
  }
  return parsed as CalcSpec
}

export const calcSpec = parseSpec()

export const palette = calcSpec.palette
export const keypadMap = calcSpec.keypad_map
export const shiftMapping = calcSpec.shift_mapping
export const physicalKeyboard = calcSpec.keyboard_physical
