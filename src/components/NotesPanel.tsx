import { useEffect, useMemo, useRef, useState } from 'react'
import type { NoteItem } from '../notes/types'
import { readRecentCalculations, type RecentCalculation } from '../state/history'
import { OverflowMenu } from './OverflowMenu'

const NOTES_SCREEN_STORAGE_KEY = 'calc-notes-screen-mode'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function renderWithSearchHighlight(value: string, searchTerm: string): string {
  const escaped = escapeHtml(value)
  const raw = searchTerm.trim()
  if (!raw) {
    return escaped
  }

  const pattern = new RegExp(`(${escapeRegExp(raw)})`, 'gi')
  return escaped.replace(pattern, '<span class="note-search-hit">$1</span>')
}

function normalizeEditorText(value: string): string {
  const next = value.replace(/\r/g, '').replace(/\u00a0/g, ' ')
  return next.endsWith('\n') ? next.slice(0, -1) : next
}

function getEditorText(editor: HTMLDivElement): string {
  const lineNodes = Array.from(editor.querySelectorAll(':scope > .render-line'))
  if (lineNodes.length > 0) {
    const lines = lineNodes.map((line) => line.textContent ?? '')
    return normalizeEditorText(lines.join('\n'))
  }

  return normalizeEditorText(editor.textContent ?? '')
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseAngleMode(value: string): 'deg' | 'rad' | null {
  const normalized = normalizeSearchText(value)
  if (normalized.includes('rad')) {
    return 'rad'
  }
  if (normalized.includes('deg')) {
    return 'deg'
  }
  return null
}

function buildResumeDataAttrs(expression: string | null, angleMode: 'deg' | 'rad' | null): string {
  if (!expression) {
    return ''
  }

  const attrs = [`data-resume-expression="${encodeURIComponent(expression)}"`]
  if (angleMode) {
    attrs.push(`data-resume-angle-mode="${angleMode}"`)
  }

  return ` ${attrs.join(' ')}`
}

function formatLine(line: string, searchTerm: string): string {
  const trimmed = line.trim()
  const titleMatch = trimmed.match(/^(##|>>)\s+(.*)$/i)
  if (titleMatch) {
    const mark = titleMatch[1]
    const title = titleMatch[2]
    return `<div class="render-line render-line-title"><span class="render-title-mark">${escapeHtml(mark)}</span> <span class="render-title-value">${renderWithSearchHighlight(title, searchTerm)}</span></div>`
  }

  if (/^r[eé]sultat\s*(d[eé]cimal)?\s*:/i.test(trimmed)) {
    const value = trimmed.replace(/^r[eé]sultat\s*(d[eé]cimal)?\s*:/i, '').trim()
    return `<div class="render-line render-line-result"><span class="render-label render-label-result">Résultat:</span> <span class="render-result-value">${renderWithSearchHighlight(value, searchTerm)}</span></div>`
  }

  if (/^expression\s*:/i.test(trimmed)) {
    const value = trimmed.replace(/^expression\s*:/i, '').trim()
    return `<div class="render-line render-line-expression"><span class="render-label">Expression:</span> <span class="render-muted-value">${renderWithSearchHighlight(value, searchTerm)}</span></div>`
  }

  if (/^mode\s*:/i.test(trimmed)) {
    const value = trimmed.replace(/^mode\s*:/i, '').trim()
    return `<div class="render-line render-line-mode"><span class="render-label">Mode:</span> <span class="render-muted-value">${renderWithSearchHighlight(value, searchTerm)}</span></div>`
  }

  if (/^date\s*:/i.test(trimmed)) {
    const value = trimmed.replace(/^date\s*:/i, '').trim()
    return `<div class="render-line render-line-date"><span class="render-label">Date:</span> <span class="render-muted-value">${renderWithSearchHighlight(value, searchTerm)}</span></div>`
  }

  if (!line) {
    return '<div class="render-line"><br></div>'
  }

  return `<div class="render-line">${renderWithSearchHighlight(line, searchTerm)}</div>`
}

function formatEditorHtml(content: string, searchTerm: string): string {
  if (!content) {
    return ''
  }

  const lines = content.split('\n')
  let inSavedBlock = false
  let valueIndex = 0
  let currentBlockExpression: string | null = null
  let currentBlockAngleMode: 'deg' | 'rad' | null = null
  const rendered: string[] = []

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
      const trimmed = line.trim()

      if (/^(##|>>)\s+/i.test(trimmed)) {
        inSavedBlock = true
        valueIndex = 0
        currentBlockExpression = null
        currentBlockAngleMode = null
        rendered.push(formatLine(line, searchTerm))
        continue
      }

      if (trimmed === '---') {
        inSavedBlock = false
        valueIndex = 0
        currentBlockExpression = null
        currentBlockAngleMode = null
        rendered.push(formatLine(line, searchTerm))
        continue
      }

      if (!trimmed) {
        rendered.push(formatLine(line, searchTerm))
        continue
      }

      if (inSavedBlock) {
        valueIndex += 1

        if (/^\[raw\s*:/i.test(trimmed)) {
          // Keep raw metadata visible and do not consume value index.
          valueIndex -= 1
          rendered.push(
            `<div class="render-line render-line-raw render-line-resume"${buildResumeDataAttrs(currentBlockExpression, currentBlockAngleMode)}><span class="render-muted-value">${renderWithSearchHighlight(trimmed, searchTerm)}</span></div>`,
          )
          continue
        }

        if (valueIndex === 1) {
          const expression = trimmed.replace(/^expression\s*:/i, '').trim()
          currentBlockExpression = expression
          rendered.push(
            `<div class="render-line render-line-expression render-line-resume"${buildResumeDataAttrs(currentBlockExpression, currentBlockAngleMode)}><span class="render-muted-value">${renderWithSearchHighlight(expression, searchTerm)}</span></div>`,
          )
          continue
        }

        if (valueIndex === 2) {
          const result = trimmed.replace(/^r[eé]sultat\s*(d[eé]cimal)?\s*:/i, '').trim()
          rendered.push(
            `<div class="render-line render-line-result render-line-resume"${buildResumeDataAttrs(currentBlockExpression, currentBlockAngleMode)}><span class="render-result-value">${renderWithSearchHighlight(result, searchTerm)}</span></div>`,
          )
          continue
        }

        if (valueIndex === 3) {
          const modeAndDate = trimmed.replace(/^mode\s*:/i, '').trim()
          const [modePart] = modeAndDate.split('|')
          const mode = modePart?.trim() ?? modeAndDate
          currentBlockAngleMode = parseAngleMode(mode)

          let combined = modeAndDate
          const nextLine = lines[i + 1]
          const nextTrimmed = nextLine?.trim() ?? ''
          if (nextTrimmed && !/^---$/.test(nextTrimmed) && !/^(##|>>)\s+/i.test(nextTrimmed)) {
            const date = nextTrimmed.replace(/^date\s*:/i, '').trim()
            combined = `${mode} | ${date}`
            i += 1
            valueIndex += 1
          }
          rendered.push(
            `<div class="render-line render-line-note-meta render-line-resume"${buildResumeDataAttrs(currentBlockExpression, currentBlockAngleMode)}><span class="render-muted-value">${renderWithSearchHighlight(combined, searchTerm)}</span></div>`,
          )
          continue
        }

        if (valueIndex === 4) {
          const date = trimmed.replace(/^date\s*:/i, '').trim()
          rendered.push(
            `<div class="render-line render-line-note-meta render-line-resume"${buildResumeDataAttrs(currentBlockExpression, currentBlockAngleMode)}><span class="render-muted-value">${renderWithSearchHighlight(date, searchTerm)}</span></div>`,
          )
          continue
        }
      }

      rendered.push(formatLine(line, searchTerm))
  }

  return rendered.join('')
}

interface NotesPanelProps {
  notes: NoteItem[]
  activeNoteId: string
  activeTab: 'calculator' | 'notes' | 'formulas'
  isOffline: boolean
  onNavigateTab: (tab: 'calculator' | 'notes' | 'formulas') => void
  onRefreshApp: () => void
  onSetActiveNote: (id: string) => void
  onCreateNote: () => void
  onDeleteNote: (id: string) => void
  onUpdateNote: (id: string, patch: Partial<Pick<NoteItem, 'title' | 'content'>>) => void
  onResumeCalculation: (entry: RecentCalculation) => void
  onResumeNoteCalculation: (payload: { expression: string; angleMode?: 'deg' | 'rad' }) => void
}

export function NotesPanel({
  notes,
  activeNoteId,
  activeTab,
  isOffline,
  onNavigateTab,
  onRefreshApp,
  onSetActiveNote,
  onCreateNote,
  onDeleteNote,
  onUpdateNote,
  onResumeCalculation,
  onResumeNoteCalculation,
}: NotesPanelProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [notesScreen, setNotesScreen] = useState<'list' | 'preview'>(() => {
    const stored = localStorage.getItem(NOTES_SCREEN_STORAGE_KEY)
    return stored === 'preview' ? 'preview' : 'list'
  })
  const [showRecentCalculations, setShowRecentCalculations] = useState(false)
  const [recentCalculations, setRecentCalculations] = useState<RecentCalculation[]>([])
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const contentEditorRef = useRef<HTMLDivElement | null>(null)
  const optionsMenuRef = useRef<HTMLDivElement | null>(null)
  const formatDebounceRef = useRef<number | null>(null)

  const filteredNotes = useMemo(() => {
    const q = normalizeSearchText(searchTerm)
    if (!q) {
      return notes
    }

    return notes.filter((note) => {
      const searchable = `${note.title}\n${note.content}`
      return normalizeSearchText(searchable).includes(q)
    })
  }, [notes, searchTerm])

  const active = notes.find((note) => note.id === activeNoteId) ?? notes[0]

  const handleNavigate = (tab: 'calculator' | 'notes' | 'formulas') => {
    setMenuOpen(false)
    onNavigateTab(tab)
  }

  useEffect(() => {
    localStorage.setItem(NOTES_SCREEN_STORAGE_KEY, notesScreen)
  }, [notesScreen])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!showOptionsMenu) {
        return
      }
      if (!optionsMenuRef.current) {
        return
      }
      if (!optionsMenuRef.current.contains(event.target as Node)) {
        setShowOptionsMenu(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [showOptionsMenu])

  useEffect(() => {
    return () => {
      if (formatDebounceRef.current !== null) {
        window.clearTimeout(formatDebounceRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (showRecentCalculations) {
      setRecentCalculations(readRecentCalculations())
    }
  }, [showRecentCalculations])

  useEffect(() => {
    if (notesScreen !== 'preview') {
      return
    }

    const editor = contentEditorRef.current
    if (!editor || !active) {
      return
    }

    if (getEditorText(editor) !== active.content) {
      editor.innerHTML = formatEditorHtml(active.content, searchTerm)
    }
  }, [notesScreen, active?.id, active?.content, searchTerm])

  const handleExportActiveNotePdf = async () => {
    if (!active) {
      return
    }

    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })

      const marginX = 40
      const marginTop = 44
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const contentWidth = pageWidth - marginX * 2

      let y = marginTop
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(15)
      const title = active.title.trim() || 'Sans titre'
      const titleLines = doc.splitTextToSize(title, contentWidth)
      doc.text(titleLines, marginX, y)
      y += titleLines.length * 18

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      const meta = `Exporte le ${new Date().toLocaleString('fr-FR')}`
      doc.text(meta, marginX, y)
      y += 20

      doc.setDrawColor(90, 110, 130)
      doc.line(marginX, y, pageWidth - marginX, y)
      y += 16

      doc.setFontSize(12)
      const content = active.content.trim() || '(note vide)'
      const contentLines = doc.splitTextToSize(content, contentWidth)

      for (const line of contentLines) {
        if (y > pageHeight - 44) {
          doc.addPage()
          y = marginTop
        }
        doc.text(line, marginX, y)
        y += 16
      }

      const safeBase = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
      const filename = `${safeBase || 'note'}-${new Date().toISOString().slice(0, 10)}.pdf`
      doc.save(filename)
    } catch {
      window.alert('Export PDF impossible pour le moment.')
    }
  }

  return (
    <div className="notes-root">
      <div className="notes-layout notes-layout-single">
        {notesScreen === 'list' ? (
          <section className="notes-selection-screen">
            <div className="notes-list-actions">
              <div className="notes-list-topbar">
                <div className="note-actions-grid">
                  <button
                    type="button"
                    className="note-btn"
                    onClick={() => {
                      onCreateNote()
                      setNotesScreen('preview')
                    }}
                  >
                    + Nouvelle note
                  </button>
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
              <input
                className="note-search-input"
                placeholder="Rechercher une note..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="notes-list-scroll">
              {filteredNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  className={note.id === activeNoteId ? 'note-item note-item-active' : 'note-item'}
                  onClick={() => {
                    onSetActiveNote(note.id)
                    setShowOptionsMenu(false)
                    setNotesScreen('preview')
                  }}
                >
                  <span className="note-item-title">{note.title || 'Sans titre'}</span>
                </button>
              ))}
              {filteredNotes.length === 0 ? <div className="note-empty-hint">Aucune note ne correspond a la recherche.</div> : null}
            </div>
          </section>
        ) : active ? (
          <section className="notes-preview-screen">
            <div className="notes-preview-toolbar">
              <button type="button" className="note-btn note-back-btn" onClick={() => setNotesScreen('list')}>
                Retour
              </button>

              <input
                className="note-title-input"
                value={active.title}
                onChange={(event) => onUpdateNote(active.id, { title: event.target.value })}
                placeholder="Titre de la note"
              />

              <div className="note-options-wrap" ref={optionsMenuRef}>
                <OverflowMenu
                  activeTab={activeTab}
                  isOffline={isOffline}
                  open={menuOpen}
                  onToggle={() => setMenuOpen((value) => !value)}
                  onNavigateTab={handleNavigate}
                  onRefreshApp={onRefreshApp}
                />
                <button
                  type="button"
                  className="status-menu-btn note-options-btn"
                  aria-haspopup="menu"
                  aria-expanded={showOptionsMenu}
                  aria-label="Options"
                  onClick={() => setShowOptionsMenu((value) => !value)}
                >
                  ...
                </button>
                {showOptionsMenu ? (
                  <div className="status-menu-panel status-menu-panel-open note-options-menu" role="menu" aria-label="Options note">
                    <button
                      type="button"
                      className="status-menu-item note-options-item"
                      role="menuitem"
                      onClick={async () => {
                        setShowOptionsMenu(false)
                        await handleExportActiveNotePdf()
                      }}
                    >
                      Exporter la note en PDF
                    </button>
                    <button
                      type="button"
                      className="status-menu-item note-options-item note-options-item-danger"
                      role="menuitem"
                      onClick={() => {
                        if (notes.length === 1) {
                          return
                        }
                        const ok = window.confirm('Supprimer cette note ? Cette action est irreversible.')
                        if (ok) {
                          onDeleteNote(active.id)
                          setShowOptionsMenu(false)
                          setNotesScreen('list')
                        }
                      }}
                      disabled={notes.length === 1}
                      title={notes.length === 1 ? 'Impossible de supprimer la derniere note.' : 'Supprimer cette note'}
                    >
                      Supprimer la note
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="note-result-preview">
              <div className="note-result-preview-title">Calculatrice</div>
              <button
                type="button"
                className="note-btn note-btn-inline"
                onClick={() => {
                  if (!showRecentCalculations) {
                    setRecentCalculations(readRecentCalculations())
                  }
                  setShowRecentCalculations((value) => !value)
                }}
              >
                {showRecentCalculations ? 'Masquer les 20 derniers calculs' : 'Afficher les 20 derniers calculs'}
              </button>

              {showRecentCalculations ? (
                <div className="recent-calculations-list" aria-label="20 derniers calculs">
                  {recentCalculations.length === 0 ? (
                    <div className="recent-calculation-empty">Aucun calcul recent trouve.</div>
                  ) : (
                    recentCalculations.map((entry, index) => (
                      <div key={`${entry.createdAt}-${index}`} className="recent-calculation-item">
                        <div className="recent-calculation-line">Expr: {entry.expression}</div>
                        <div className="recent-calculation-line recent-calculation-result">Res: {entry.resultMain || entry.resultSub || 'Erreur'}</div>
                        <div className="recent-calculation-meta">
                          {entry.angleMode.toUpperCase()} | {entry.exactMode ? 'EXACT' : 'DECIMAL'} |{' '}
                          {entry.resultFormat.toUpperCase()} P{entry.resultPrecision} |{' '}
                          {new Date(entry.createdAt).toLocaleString('fr-FR')}
                        </div>
                        <button type="button" className="note-btn note-btn-inline" onClick={() => onResumeCalculation(entry)}>
                          Reprendre ce calcul
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            <div
              ref={contentEditorRef}
              className="note-content-input note-content-editor"
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              aria-label="Contenu de la note"
              data-placeholder="Ecris ici tes notes, calculs et observations..."
              onInput={(event) => {
                const editor = event.currentTarget
                const text = getEditorText(editor)
                onUpdateNote(active.id, { content: text })

                if (formatDebounceRef.current !== null) {
                  window.clearTimeout(formatDebounceRef.current)
                }

                formatDebounceRef.current = window.setTimeout(() => {
                  const latestText = getEditorText(editor)
                  const highlighted = formatEditorHtml(latestText, searchTerm)
                  if (editor.innerHTML !== highlighted) {
                    editor.innerHTML = highlighted
                  }
                }, 300)
              }}
              onBlur={(event) => {
                const editor = event.currentTarget
                if (formatDebounceRef.current !== null) {
                  window.clearTimeout(formatDebounceRef.current)
                  formatDebounceRef.current = null
                }
                const text = getEditorText(editor)
                const highlighted = formatEditorHtml(text, searchTerm)
                if (editor.innerHTML !== highlighted) {
                  editor.innerHTML = highlighted
                }
              }}
              onPaste={(event) => {
                event.preventDefault()
                const text = event.clipboardData.getData('text/plain')
                const selection = window.getSelection()
                if (!selection || selection.rangeCount === 0) {
                  return
                }

                const range = selection.getRangeAt(0)
                range.deleteContents()
                range.insertNode(document.createTextNode(text))
                range.collapse(false)
                selection.removeAllRanges()
                selection.addRange(range)
              }}
              onClick={(event) => {
                const target = event.target as HTMLElement | null
                const replayNode = target?.closest('[data-resume-expression]') as HTMLElement | null
                if (!replayNode) {
                  return
                }

                const encodedExpression = replayNode.getAttribute('data-resume-expression')
                if (!encodedExpression) {
                  return
                }

                let expression = ''
                try {
                  expression = decodeURIComponent(encodedExpression)
                } catch {
                  return
                }

                if (!expression.trim()) {
                  return
                }

                const angleModeRaw = replayNode.getAttribute('data-resume-angle-mode')
                const angleMode = angleModeRaw === 'deg' || angleModeRaw === 'rad' ? angleModeRaw : undefined

                event.preventDefault()
                event.stopPropagation()
                onResumeNoteCalculation({ expression, angleMode })
              }}
            />
          </section>
        ) : null}
      </div>
    </div>
  )
}
