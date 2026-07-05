import { useState } from 'react'
import { OverflowMenu } from './OverflowMenu'

interface FormulaItem {
  id: string
  label: string
  expression: string
  hint: string
  angleMode?: 'deg' | 'rad'
}

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

interface FormulaLibraryProps {
  onUseFormula: (payload: { expression: string; angleMode?: 'deg' | 'rad' }) => void
  activeTab: 'calculator' | 'notes' | 'formulas' | 'settings'
  isOffline: boolean
  onNavigateTab: (tab: 'calculator' | 'notes' | 'formulas' | 'settings') => void
  onRefreshApp: () => void
}

export function FormulaLibrary({ onUseFormula, activeTab, isOffline, onNavigateTab, onRefreshApp }: FormulaLibraryProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleNavigate = (tab: 'calculator' | 'notes' | 'formulas' | 'settings') => {
    setMenuOpen(false)
    onNavigateTab(tab)
  }

  return (
    <section className="formulas-root" aria-label="Bibliotheque de formules">
      <div className="formulas-card">
        <div className="formulas-title-row">
          <div className="formulas-title">Mini bibliotheque formules</div>
          <OverflowMenu
            activeTab={activeTab}
            isOffline={isOffline}
            open={menuOpen}
            onToggle={() => setMenuOpen((v) => !v)}
            onNavigateTab={handleNavigate}
            onRefreshApp={onRefreshApp}
          />
        </div>
        <div className="formulas-list">
          {FORMULAS.map((item) => (
            <article key={item.id} className="formula-item">
              <div className="formula-item-head">
                <div className="formula-item-title">{item.label}</div>
                <button
                  type="button"
                  className="note-btn"
                  onClick={() => onUseFormula({ expression: item.expression, angleMode: item.angleMode })}
                  title="Charger formule dans la calculatrice"
                >
                  Utiliser
                </button>
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
