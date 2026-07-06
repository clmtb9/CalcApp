import { useEffect, useMemo, useState } from 'react'
import { OverflowMenu } from './OverflowMenu'

interface FormulaItem {
  id: string
  label: string
  expression: string
  hint: string
  angleMode?: 'deg' | 'rad'
}

interface FormulaDraft {
  label: string
  expression: string
  hint: string
  angleMode: '' | 'deg' | 'rad'
}

const FORMULAS_STORAGE_KEY = 'scientific-calculator-formulas'

const FORMULAS: FormulaItem[] = [
  {
    id: 'circle-area',
    label: 'Aire cercle',
    expression: 'pi*r^2',
    hint: 'A = pi * r^2',
  },
  {
    id: 'pythagore',
    label: 'Pythagore',
    expression: 'sqrt(a^2+b^2)',
    hint: 'c = sqrt(a^2 + b^2)',
  },
  {
    id: 'quadratic-delta',
    label: 'Delta',
    expression: 'b^2-4*a*c',
    hint: 'Delta = b^2 - 4ac',
  },
  {
    id: 'ohm',
    label: 'Loi Ohm',
    expression: 'U/R',
    hint: 'I = U / R',
  },
  {
    id: 'kinetic-energy',
    label: 'Energie cinetique',
    expression: '0.5*m*v^2',
    hint: 'E = 1/2 m v^2',
  },
  {
    id: 'sin-rule-deg',
    label: 'Sinus (DEG)',
    expression: 'sin(30)',
    hint: 'Exemple angle en degres',
    angleMode: 'deg',
  },
]

const EMPTY_DRAFT: FormulaDraft = {
  label: '',
  expression: '',
  hint: '',
  angleMode: '',
}

function createFormulaId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `formula-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

function toDraft(item: FormulaItem): FormulaDraft {
  return {
    label: item.label,
    expression: item.expression,
    hint: item.hint,
    angleMode: item.angleMode ?? '',
  }
}

function normalizeFormulaInput(raw: string): string {
  return raw
    .replace(/\r/g, '')
    .replace(/\n+/g, '')
    .replace(/\s+/g, '')
    .replace(/,/g, '.')
    .replace(/[×x]/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'pi')
    .trim()
}

function loadFormulas(): FormulaItem[] {
  const raw = localStorage.getItem(FORMULAS_STORAGE_KEY)
  if (!raw) {
    return FORMULAS
  }

  try {
    const parsed = JSON.parse(raw) as FormulaItem[]
    if (!Array.isArray(parsed)) {
      return FORMULAS
    }

    const cleaned = parsed.reduce<FormulaItem[]>((acc, entry) => {
      if (!entry || typeof entry !== 'object') {
        return acc
      }

      const id = typeof entry.id === 'string' && entry.id.trim() ? entry.id : createFormulaId()
      const label = typeof entry.label === 'string' ? entry.label.trim() : ''
      const expression = typeof entry.expression === 'string' ? entry.expression.trim() : ''
      const hint = typeof entry.hint === 'string' ? entry.hint.trim() : ''
      const angleMode = entry.angleMode === 'deg' || entry.angleMode === 'rad' ? entry.angleMode : undefined
      if (!label || !expression) {
        return acc
      }

      acc.push({
        id,
        label,
        expression,
        hint,
        angleMode,
      })
      return acc
    }, [])

    return cleaned.length > 0 ? cleaned : FORMULAS
  } catch {
    return FORMULAS
  }
}

interface FormulaLibraryProps {
  onUseFormula: (payload: { expression: string; angleMode?: 'deg' | 'rad' }) => void
  activeTab: 'calculator' | 'notes' | 'formulas' | 'settings'
  isOffline: boolean
  onNavigateTab: (tab: 'calculator' | 'notes' | 'formulas' | 'settings') => void
  onRefreshApp: () => void
}

export function FormulaLibrary({ onUseFormula, activeTab, isOffline, onNavigateTab, onRefreshApp }: FormulaLibraryProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [formulas, setFormulas] = useState<FormulaItem[]>(() => loadFormulas())
  const [draft, setDraft] = useState<FormulaDraft>(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [manageModeOn, setManageModeOn] = useState(false)

  const isEditing = editingId !== null
  const canSaveDraft = useMemo(() => draft.label.trim().length > 0 && draft.expression.trim().length > 0, [draft])

  useEffect(() => {
    localStorage.setItem(FORMULAS_STORAGE_KEY, JSON.stringify(formulas))
  }, [formulas])

  const handleNavigate = (tab: 'calculator' | 'notes' | 'formulas' | 'settings') => {
    setMenuOpen(false)
    onNavigateTab(tab)
  }

  const resetDraft = () => {
    setDraft(EMPTY_DRAFT)
    setEditingId(null)
  }

  const handleCreateOrUpdate = () => {
    const label = draft.label.trim()
    const expression = normalizeFormulaInput(draft.expression)
    const hint = draft.hint.trim()
    const angleMode = draft.angleMode === '' ? undefined : draft.angleMode

    if (!label || !expression) {
      return
    }

    if (editingId) {
      setFormulas((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? {
                ...item,
                label,
                expression,
                hint,
                angleMode,
              }
            : item,
        ),
      )
    } else {
      setFormulas((prev) => [
        {
          id: createFormulaId(),
          label,
          expression,
          hint,
          angleMode,
        },
        ...prev,
      ])
    }

    resetDraft()
  }

  const handleEdit = (item: FormulaItem) => {
    setEditingId(item.id)
    setDraft(toDraft(item))
  }

  const handleDelete = (id: string) => {
    setFormulas((prev) => prev.filter((item) => item.id !== id))
    if (editingId === id) {
      resetDraft()
    }
  }

  const handleToggleManageMode = () => {
    setManageModeOn((prev) => {
      if (prev) {
        resetDraft()
      }
      return !prev
    })
  }

  return (
    <section className="formulas-root" aria-label="Bibliotheque de formules">
      <div className="formulas-card">
        <div className="formulas-title-row">
          <div className="formulas-title">Mini bibliotheque formules</div>
          <div className="formulas-title-actions">
            <button type="button" className="note-btn formula-manage-btn" onClick={handleToggleManageMode}>
              {manageModeOn ? 'Terminer' : 'Modifier'}
            </button>
            <OverflowMenu
              activeTab={activeTab}
              isOffline={isOffline}
              open={menuOpen}
              onToggle={() => setMenuOpen((v) => !v)}
              onNavigateTab={handleNavigate}
              onRefreshApp={onRefreshApp}
            />
          </div>
        </div>

        {manageModeOn ? (
          <div className="formula-editor">
            <div className="formula-editor-title">{isEditing ? 'Modifier formule' : 'Nouvelle formule'}</div>
            <input
              type="text"
              className="formula-input"
              placeholder="Nom formule"
              value={draft.label}
              onChange={(event) => setDraft((prev) => ({ ...prev, label: event.target.value }))}
            />
            <input
              type="text"
              className="formula-input formula-input-mono"
              placeholder="Expression ex: (a+b)^2"
              value={draft.expression}
              onChange={(event) => setDraft((prev) => ({ ...prev, expression: event.target.value }))}
            />
            <input
              type="text"
              className="formula-input"
              placeholder="Aide courte (optionnel)"
              value={draft.hint}
              onChange={(event) => setDraft((prev) => ({ ...prev, hint: event.target.value }))}
            />

            <div className="formula-editor-angle-row" role="group" aria-label="Mode angle formule">
              <button
                type="button"
                className={draft.angleMode === '' ? 'note-btn formula-angle-btn formula-angle-btn-active' : 'note-btn formula-angle-btn'}
                onClick={() => setDraft((prev) => ({ ...prev, angleMode: '' }))}
              >
                Auto
              </button>
              <button
                type="button"
                className={draft.angleMode === 'deg' ? 'note-btn formula-angle-btn formula-angle-btn-active' : 'note-btn formula-angle-btn'}
                onClick={() => setDraft((prev) => ({ ...prev, angleMode: 'deg' }))}
              >
                DEG
              </button>
              <button
                type="button"
                className={draft.angleMode === 'rad' ? 'note-btn formula-angle-btn formula-angle-btn-active' : 'note-btn formula-angle-btn'}
                onClick={() => setDraft((prev) => ({ ...prev, angleMode: 'rad' }))}
              >
                RAD
              </button>
            </div>

            <div className="formula-editor-actions">
              <button type="button" className="note-btn" onClick={handleCreateOrUpdate} disabled={!canSaveDraft}>
                {isEditing ? 'Enregistrer' : 'Ajouter'}
              </button>
              {isEditing ? (
                <button type="button" className="note-btn" onClick={resetDraft}>
                  Annuler
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="formulas-list">
          {formulas.map((item) => (
            <article
              key={item.id}
              className={manageModeOn ? 'formula-item' : 'formula-item formula-item-clickable'}
              role={manageModeOn ? undefined : 'button'}
              tabIndex={manageModeOn ? -1 : 0}
              onClick={() => {
                if (!manageModeOn) {
                  onUseFormula({ expression: item.expression, angleMode: item.angleMode })
                }
              }}
              onKeyDown={(event) => {
                if (!manageModeOn && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault()
                  onUseFormula({ expression: item.expression, angleMode: item.angleMode })
                }
              }}
              aria-label={manageModeOn ? `Formule ${item.label}` : `Utiliser formule ${item.label}`}
            >
              <div className="formula-item-head">
                <div className="formula-item-title">{item.label}</div>
                {manageModeOn ? (
                  <div className="formula-item-actions">
                    <button
                      type="button"
                      className="note-btn formula-item-icon-btn"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleEdit(item)
                      }}
                      aria-label={`Editer formule ${item.label}`}
                      title="Editer formule"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="note-btn note-btn-danger formula-item-icon-btn"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleDelete(item.id)
                      }}
                      aria-label={`Supprimer formule ${item.label}`}
                      title="Supprimer formule"
                    >
                      🗑
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="formula-item-expression">{item.expression}</div>
              <div className="formula-item-hint">{item.hint}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
