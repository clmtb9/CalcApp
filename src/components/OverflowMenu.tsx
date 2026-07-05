interface OverflowMenuProps {
  activeTab: 'calculator' | 'notes' | 'formulas'
  isOffline: boolean
  open: boolean
  onToggle: () => void
  onNavigateTab: (tab: 'calculator' | 'notes' | 'formulas') => void
  onRefreshApp: () => void
}

export function OverflowMenu({
  activeTab,
  isOffline,
  open,
  onToggle,
  onNavigateTab,
  onRefreshApp,
}: OverflowMenuProps) {
  return (
    <div className="status-menu-wrap">
      <button
        type="button"
        className="status-menu-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Menu"
        onClick={onToggle}
      >
        ⋯
      </button>
      <div className={open ? 'status-menu-panel status-menu-panel-open' : 'status-menu-panel'} role="menu">
        <button
          type="button"
          role="menuitem"
          className={activeTab === 'calculator' ? 'status-menu-item status-menu-item-active' : 'status-menu-item'}
          onClick={() => onNavigateTab('calculator')}
        >
          Calculatrice
        </button>
        <button
          type="button"
          role="menuitem"
          className={activeTab === 'notes' ? 'status-menu-item status-menu-item-active' : 'status-menu-item'}
          onClick={() => onNavigateTab('notes')}
        >
          Notes
        </button>
        <button
          type="button"
          role="menuitem"
          className={activeTab === 'formulas' ? 'status-menu-item status-menu-item-active' : 'status-menu-item'}
          onClick={() => onNavigateTab('formulas')}
        >
          Formules
        </button>
        <button
          type="button"
          role="menuitem"
          className="status-menu-item"
          title="Force le chargement de la nouvelle mise en page"
          onClick={onRefreshApp}
        >
          MAJ FORCEE
        </button>
        {isOffline ? <div className="status-menu-offline">Offline</div> : null}
      </div>
    </div>
  )
}
