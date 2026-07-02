import { useEffect, useRef, useState } from 'react'
import type { NoteItem } from '../notes/types'

const NEW_NOTE_VALUE = '__new_note__'

interface SaveResultModalProps {
  open: boolean
  notes: NoteItem[]
  initialNoteId: string
  defaultLabel: string
  onCancel: () => void
  onConfirm: (payload: { noteId: string; label: string; newNoteTitle?: string }) => void
}

export function SaveResultModal({
  open,
  notes,
  initialNoteId,
  defaultLabel,
  onCancel,
  onConfirm,
}: SaveResultModalProps) {
  const [label, setLabel] = useState(defaultLabel)
  const [noteId, setNoteId] = useState(initialNoteId)
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const labelInputRef = useRef<HTMLInputElement | null>(null)
  const shouldCreateNewNote = noteId === NEW_NOTE_VALUE
  const canConfirm = Boolean(label.trim() && noteId && (!shouldCreateNewNote || newNoteTitle.trim()))

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canConfirm) {
      return
    }
    onConfirm({
      noteId,
      label: label.trim(),
      newNoteTitle: shouldCreateNewNote ? newNoteTitle.trim() : undefined,
    })
  }

  useEffect(() => {
    if (open) {
      setLabel(defaultLabel)
      setNoteId(initialNoteId)
      setNewNoteTitle('')

      window.setTimeout(() => {
        labelInputRef.current?.focus()
        labelInputRef.current?.select()
      }, 0)
    }
  }, [open, defaultLabel, initialNoteId])

  if (!open) {
    return null
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal-card" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
        <h2>Enregistrer le resultat</h2>

        <label className="modal-label">
          Note cible
          <select className="note-target-select" value={noteId} onChange={(event) => setNoteId(event.target.value)}>
            {notes.map((note) => (
              <option key={note.id} value={note.id}>
                {note.title || 'Sans titre'}
              </option>
            ))}
            <option value={NEW_NOTE_VALUE}>+ Nouvelle note...</option>
          </select>
        </label>

        {shouldCreateNewNote ? (
          <label className="modal-label">
            Nom de la nouvelle note
            <input
              className="note-title-input"
              value={newNoteTitle}
              onChange={(event) => setNewNoteTitle(event.target.value)}
              placeholder="Ex: Béton armé"
            />
          </label>
        ) : null}

        <label className="modal-label">
          Nom du resultat
          <input
            ref={labelInputRef}
            className="note-title-input"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Ex: Poutre facade"
          />
        </label>

        <div className="modal-actions">
          <button type="button" className="mode-btn" onClick={onCancel}>
            Annuler
          </button>
          <button type="submit" className="mode-btn mode-btn-active" disabled={!canConfirm}>
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  )
}
