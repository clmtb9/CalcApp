import { useEffect, useState } from 'react'
import { Calculator } from './components/Calculator'
import { FormulaLibrary } from './components/FormulaLibrary'
import { NotesPanel } from './components/NotesPanel'
import { useNotes } from './notes/useNotes'
import type { RecentCalculation } from './state/history'

const VOLATILE_STORAGE_KEYS = ['scientific-calculator-history']

function App() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'notes' | 'formulas'>('calculator')
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

    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((registration) => registration.update()))
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

  return (
    <div className="app-shell">
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
      ) : (
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
      )}
    </div>
  )
}

export default App
