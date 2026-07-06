import { useState } from 'react'
import { OverflowMenu } from './OverflowMenu'

interface SettingsPageProps {
  activeTab: 'calculator' | 'notes' | 'formulas' | 'settings'
  isOffline: boolean
  onNavigateTab: (tab: 'calculator' | 'notes' | 'formulas' | 'settings') => void
  onRefreshApp: () => void
  buildLabel: string
  wakeLockEnabled: boolean
  onToggleWakeLock: (enabled: boolean) => void
  blackKeysEnabled: boolean
  onToggleBlackKeys: (enabled: boolean) => void
}

export function SettingsPage({
  activeTab,
  isOffline,
  onNavigateTab,
  onRefreshApp,
  buildLabel,
  wakeLockEnabled,
  onToggleWakeLock,
  blackKeysEnabled,
  onToggleBlackKeys,
}: SettingsPageProps) {
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
            <label className="settings-switch" htmlFor="wake-lock-toggle">
              <span className="settings-switch-label">Wake lock ecran</span>
              <input
                id="wake-lock-toggle"
                type="checkbox"
                className="settings-switch-input"
                checked={wakeLockEnabled}
                onChange={(event) => onToggleWakeLock(event.target.checked)}
                aria-label="Activer wake lock ecran"
              />
              <span className="settings-switch-track" aria-hidden="true" />
            </label>
            <div className="settings-item-text">
              Garde ecran allume pendant usage quand navigateur l autorise. Orientation demandee en portrait.
            </div>
          </article>

          <article className="settings-item">
            <div className="settings-item-title">Clavier</div>
            <label className="settings-switch" htmlFor="black-keys-toggle">
              <span className="settings-switch-label">Touches noires</span>
              <input
                id="black-keys-toggle"
                type="checkbox"
                className="settings-switch-input"
                checked={blackKeysEnabled}
                onChange={(event) => onToggleBlackKeys(event.target.checked)}
                aria-label="Activer fond noir sur toutes les touches"
              />
              <span className="settings-switch-track" aria-hidden="true" />
            </label>
            <div className="settings-item-text">Force fond noir uniforme sur toutes touches du keypad.</div>
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