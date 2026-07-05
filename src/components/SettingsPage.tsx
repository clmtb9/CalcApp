import { useState } from 'react'
import { OverflowMenu } from './OverflowMenu'

interface SettingsPageProps {
  activeTab: 'calculator' | 'notes' | 'formulas' | 'settings'
  isOffline: boolean
  onNavigateTab: (tab: 'calculator' | 'notes' | 'formulas' | 'settings') => void
  onRefreshApp: () => void
  buildLabel: string
}

export function SettingsPage({ activeTab, isOffline, onNavigateTab, onRefreshApp, buildLabel }: SettingsPageProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleNavigate = (tab: 'calculator' | 'notes' | 'formulas' | 'settings') => {
    setMenuOpen(false)
    onNavigateTab(tab)
  }

  return (
    <section className="settings-root" aria-label="Parametres et reglages">
      <div className="settings-card">
        <div className="settings-title-row">
          <div className="settings-title-block">
            <div className="settings-title">Parametres</div>
            <div className="settings-subtitle">Reglages rapides de l application</div>
          </div>
          <OverflowMenu
            activeTab={activeTab}
            isOffline={isOffline}
            open={menuOpen}
            onToggle={() => setMenuOpen((value) => !value)}
            onNavigateTab={handleNavigate}
            onRefreshApp={onRefreshApp}
          />
        </div>

        <div className="settings-list">
          <article className="settings-item">
            <div className="settings-item-title">Ecran</div>
            <div className="settings-item-text">Wake lock actif quand le navigateur l autorise. Orientation demandee en portrait.</div>
          </article>

          <article className="settings-item">
            <div className="settings-item-title">Version</div>
            <div className="settings-item-text">{buildLabel}</div>
          </article>

          <article className="settings-item settings-actions">
            <button type="button" className="note-btn" onClick={() => onNavigateTab('calculator')}>
              Retour calculatrice
            </button>
            <button type="button" className="note-btn" onClick={() => onNavigateTab('formulas')}>
              Ouvrir formules
            </button>
            <button type="button" className="note-btn" onClick={onRefreshApp}>
              Forcer MAJ
            </button>
          </article>
        </div>
      </div>
    </section>
  )
}