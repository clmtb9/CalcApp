import type { ResultDisplayFormat } from '../state/types'

interface ModeStripProps {
  resultFormat: ResultDisplayFormat
  onSetResultFormat: (format: ResultDisplayFormat) => void
}

export function ModeStrip({
  resultFormat,
  onSetResultFormat,
}: ModeStripProps) {
  return (
    <div className="mode-strip">
      <div className="mode-strip-group">
        <button
          type="button"
          className={resultFormat === 'decimal' ? 'mode-btn mode-btn-active' : 'mode-btn'}
          onClick={() => onSetResultFormat('decimal')}
        >
          DEC
        </button>
        <button
          type="button"
          className={resultFormat === 'scientific' ? 'mode-btn mode-btn-active' : 'mode-btn'}
          onClick={() => onSetResultFormat('scientific')}
        >
          SCI AUTO
        </button>
      </div>
    </div>
  )
}
