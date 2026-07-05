interface OverflowMenuProps {
  activeTab: 'calculator' | 'notes' | 'formulas'
  isOffline?: boolean
  open?: boolean
  onToggle?: () => void
  onNavigateTab: (tab: 'calculator' | 'notes' | 'formulas') => void
  onRefreshApp?: () => void
}

export function OverflowMenu({
  activeTab,
  onNavigateTab,
}: OverflowMenuProps) {
  const nextTab = activeTab === 'calculator' ? 'notes' : 'calculator'

  return (
    <div className="status-menu-wrap">
      <button
        type="button"
        className="status-toggle-btn status-toggle-btn-switch"
        title={nextTab === 'notes' ? 'Basculer vers Notes' : 'Basculer vers Calc'}
        onClick={() => onNavigateTab(nextTab)}
      >
        {nextTab === 'notes' ? 'NOTES' : 'CALC'}
      </button>
    </div>
  )
}
