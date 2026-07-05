import { useEffect, useState } from 'react'
import { Calculator } from './components/Calculator'
import { FormulaLibrary } from './components/FormulaLibrary'
import { NotesPanel } from './components/NotesPanel'
import { SettingsPage } from './components/SettingsPage'
import { useNotes } from './notes/useNotes'
import type { RecentCalculation } from './state/history'

const VOLATILE_STORAGE_KEYS = ['scientific-calculator-history']
const BUILD_LABEL = `v${__BUILD_ID__}`

type WakeLockSentinelLike = {
  released: boolean
  release: () => Promise<void>
}

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>
  }
}

type ScreenOrientationWithLock = ScreenOrientation & {
  lock?: (orientation: 'portrait' | 'portrait-primary') => Promise<void>
}

function App() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'notes' | 'formulas' | 'settings'>('calculator')
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine)
  const [resumeCalculation, setResumeCalculation] = useState<RecentCalculation | null>(null)
  const [resumeFromNote, setResumeFromNote] = useState<{ expression: string; angleMode?: 'deg' | 'rad' } | null>(null)
  const {
    notes,
    activeNote,
    activeNoteId,
    setActiveNoteId,
    createNote,
    updateNote,
    deleteNote,
    appendNamedResult,
    appendNamedResultToNewNote,
  } = useNotes()

  const handleMaj = async () => {
    VOLATILE_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key))

    if ('caches' in window) {
      try {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      } catch {
        // Continue with update flow even if cache purge fails.
      }
    }

    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(
          registrations.map(async (registration) => {
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' })
            }
            await registration.update()
            await registration.unregister()
          }),
        )
      } catch {
        // Continue with reload even if SW update fails.
      }
    }

    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.set('maj', Date.now().toString())
    window.location.href = nextUrl.toString()
  }

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    let wakeLock: WakeLockSentinelLike | null = null
    let disposed = false

    const requestWakeLock = async () => {
      const navigatorWithWakeLock = navigator as NavigatorWithWakeLock
      if (!navigatorWithWakeLock.wakeLock?.request || document.visibilityState !== 'visible') {
        return
      }

      try {
        wakeLock = await navigatorWithWakeLock.wakeLock.request('screen')
      } catch {
        wakeLock = null
      }
    }

    const lockOrientation = async () => {
      const orientation = screen.orientation as ScreenOrientationWithLock | undefined
      if (!orientation?.lock) {
        return
      }

      try {
        await orientation.lock('portrait')
      } catch {
        // Ignore unsupported or user-gesture restricted orientation locks.
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !disposed) {
        void requestWakeLock()
      }
    }

    void requestWakeLock()
    void lockOrientation()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (wakeLock && !wakeLock.released) {
        void wakeLock.release()
      }
    }
  }, [])

  return (
    <div className="app-shell">
      <div className="app-build-badge" aria-label={`Version ${BUILD_LABEL}`}>
        {BUILD_LABEL}
      </div>
      {activeTab === 'calculator' ? (
        <Calculator
          notes={notes}
          targetNoteId={activeNoteId}
          resumeCalculation={resumeCalculation}
          resumeFromNote={resumeFromNote}
          activeTab={activeTab}
          isOffline={isOffline}
          onNavigateTab={setActiveTab}
          onRefreshApp={handleMaj}
          onSaveNamedResult={(payload) => {
            const snapshot = {
              label: payload.label,
              expression: payload.expression,
              resultMain: payload.resultMain,
              resultSub: payload.resultSub,
              resultNumeric: payload.resultNumeric,
              resultFormat: payload.resultFormat,
              resultPrecision: payload.resultPrecision,
              angleMode: payload.angleMode,
              exactMode: payload.exactMode,
              createdAt: new Date().toISOString(),
            }

            if (payload.newNoteTitle) {
              const createdId = appendNamedResultToNewNote(payload.newNoteTitle, snapshot)
              setActiveNoteId(createdId)
            } else if (payload.noteId) {
              appendNamedResult(payload.noteId, snapshot)
              setActiveNoteId(payload.noteId)
            }

            setActiveTab('calculator')
          }}
        />
      ) : activeTab === 'notes' ? (
        <NotesPanel
          notes={notes}
          activeNoteId={activeNote?.id ?? activeNoteId}
          activeTab={activeTab}
          isOffline={isOffline}
          onNavigateTab={setActiveTab}
          onRefreshApp={handleMaj}
          onSetActiveNote={setActiveNoteId}
          onCreateNote={() => createNote()}
          onDeleteNote={deleteNote}
          onUpdateNote={updateNote}
          onResumeCalculation={(entry) => {
            setResumeCalculation({ ...entry })
            setActiveTab('calculator')
          }}
          onResumeNoteCalculation={(payload) => {
            setResumeFromNote({ ...payload })
            setActiveTab('calculator')
          }}
        />
      ) : activeTab === 'formulas' ? (
        <FormulaLibrary
          activeTab={activeTab}
          isOffline={isOffline}
          onNavigateTab={setActiveTab}
          onRefreshApp={handleMaj}
          onUseFormula={(payload) => {
            setResumeFromNote({ expression: payload.expression, angleMode: payload.angleMode })
            setActiveTab('calculator')
          }}
        />
      ) : (
        <SettingsPage
          activeTab={activeTab}
          isOffline={isOffline}
          onNavigateTab={setActiveTab}
          onRefreshApp={handleMaj}
          buildLabel={BUILD_LABEL}
        />
      )}
    </div>
  )
}

export default App
