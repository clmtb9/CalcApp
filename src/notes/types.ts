export interface NoteItem {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface ResultSnapshot {
  label: string
  expression: string
  resultMain: string
  resultSub: string
  resultNumeric: number | null
  resultFormat: 'decimal' | 'scientific'
  resultPrecision: number
  angleMode: 'deg' | 'rad'
  exactMode: boolean
  createdAt: string
}
