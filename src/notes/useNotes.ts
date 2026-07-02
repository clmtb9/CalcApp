import { useEffect, useMemo, useState } from 'react'
import type { ResultSnapshot, NoteItem } from './types'

const NOTES_STORAGE_KEY = 'calc-notes-v1'
const ACTIVE_NOTE_KEY = 'calc-notes-active-id'

function nowIso(): string {
  return new Date().toISOString()
}

function createDefaultNote(): NoteItem {
  const timestamp = nowIso()
  return {
    id: crypto.randomUUID(),
    title: 'Note rapide',
    content: '',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function safeParseNotes(raw: string | null): NoteItem[] {
  if (!raw) {
    return [createDefaultNote()]
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [createDefaultNote()]
    }

    return parsed.filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string') as NoteItem[]
  } catch {
    return [createDefaultNote()]
  }
}

function normalizeNotes(items: unknown[]): NoteItem[] {
  const cleaned = items
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const candidate = item as Partial<NoteItem>
      const timestamp = nowIso()
      return {
        id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : crypto.randomUUID(),
        title: typeof candidate.title === 'string' ? candidate.title : 'Sans titre',
        content: typeof candidate.content === 'string' ? candidate.content : '',
        createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : timestamp,
        updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : timestamp,
      } satisfies NoteItem
    })

  if (cleaned.length === 0) {
    return [createDefaultNote()]
  }

  return cleaned
}

function getInitialNotesState(): { notes: NoteItem[]; activeNoteId: string } {
  const initialNotes = safeParseNotes(localStorage.getItem(NOTES_STORAGE_KEY))
  const storedActiveNoteId = localStorage.getItem(ACTIVE_NOTE_KEY)

  return {
    notes: initialNotes,
    activeNoteId:
      storedActiveNoteId && initialNotes.some((note) => note.id === storedActiveNoteId)
        ? storedActiveNoteId
        : initialNotes[0].id,
  }
}

function cleanResultValue(value: string): string {
  return value
    .trimStart()
    .replace(/^[=≈~∼]\s*/, '')
    .trim()
}

function formatResultBlock(snapshot: ResultSnapshot): string {
  const formattedDate = new Date(snapshot.createdAt).toLocaleString('fr-FR')
  const cleanedMain = cleanResultValue(snapshot.resultMain)
  const cleanedSub = cleanResultValue(snapshot.resultSub)
  const exactResult = cleanedMain || '(vide)'
  const approxResult = cleanedSub || cleanedMain || '(vide)'
  const rawValue =
    snapshot.resultNumeric !== null && Number.isFinite(snapshot.resultNumeric) ? snapshot.resultNumeric.toString() : approxResult
  const rawMeta = `[raw:${rawValue || '(vide)'}]`
  const blockMeta = `${snapshot.angleMode.toUpperCase()} | ${formattedDate}`
  const lines = [
    `>> ${snapshot.label}`,
    `${snapshot.expression || '(vide)'}`,
    `${exactResult} ~ ${approxResult}`,
    `${rawMeta}`,
    `${blockMeta}`,
  ]

  return lines.join('\n')
}

export function useNotes() {
  const [initialState] = useState(() => getInitialNotesState())
  const [notes, setNotes] = useState<NoteItem[]>(initialState.notes)
  const [activeNoteId, setActiveNoteId] = useState<string>(initialState.activeNoteId)

  useEffect(() => {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes))
  }, [notes])

  useEffect(() => {
    localStorage.setItem(ACTIVE_NOTE_KEY, activeNoteId)
  }, [activeNoteId])

  const activeNote = useMemo(() => {
    return notes.find((note) => note.id === activeNoteId) ?? notes[0] ?? null
  }, [notes, activeNoteId])

  const createNote = (title = 'Nouvelle note') => {
    const timestamp = nowIso()
    const next: NoteItem = {
      id: crypto.randomUUID(),
      title,
      content: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    setNotes((prev) => [next, ...prev])
    setActiveNoteId(next.id)
  }

  const updateNote = (noteId: string, patch: Partial<Pick<NoteItem, 'title' | 'content'>>) => {
    const timestamp = nowIso()
    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? {
              ...note,
              ...patch,
              updatedAt: timestamp,
            }
          : note,
      ),
    )
  }

  const deleteNote = (noteId: string) => {
    setNotes((prev) => {
      const filtered = prev.filter((note) => note.id !== noteId)
      if (filtered.length === 0) {
        const fallback = createDefaultNote()
        setActiveNoteId(fallback.id)
        return [fallback]
      }
      if (noteId === activeNoteId) {
        setActiveNoteId(filtered[0].id)
      }
      return filtered
    })
  }

  const appendNamedResult = (noteId: string, snapshot: ResultSnapshot) => {
    const block = formatResultBlock(snapshot)

    setNotes((prev) =>
      prev.map((note) => {
        if (note.id !== noteId) {
          return note
        }
        const sep = note.content.trim().length > 0 ? '\n\n---\n\n' : ''
        return {
          ...note,
          content: `${note.content}${sep}${block}`,
          updatedAt: nowIso(),
        }
      }),
    )
  }

  const appendNamedResultToNewNote = (title: string, snapshot: ResultSnapshot): string => {
    const timestamp = nowIso()
    const block = formatResultBlock(snapshot)
    const next: NoteItem = {
      id: crypto.randomUUID(),
      title: title.trim() || 'Nouvelle note',
      content: block,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    setNotes((prev) => [next, ...prev])
    setActiveNoteId(next.id)
    return next.id
  }

  const exportNotesAsJson = (): string => {
    return JSON.stringify(notes, null, 2)
  }

  const importNotesFromJson = (rawJson: string): { ok: boolean; message: string } => {
    try {
      const parsed = JSON.parse(rawJson)
      if (!Array.isArray(parsed)) {
        return { ok: false, message: 'Le fichier JSON doit contenir un tableau de notes.' }
      }

      const normalized = normalizeNotes(parsed)
      setNotes(normalized)

      const nextActiveId = normalized.some((note) => note.id === activeNoteId) ? activeNoteId : normalized[0].id
      setActiveNoteId(nextActiveId)

      return { ok: true, message: `${normalized.length} note(s) importee(s).` }
    } catch {
      return { ok: false, message: 'JSON invalide. Import impossible.' }
    }
  }

  const buildResultBlock = (snapshot: ResultSnapshot): string => {
    return formatResultBlock(snapshot)
  }

  return {
    notes,
    activeNote,
    activeNoteId,
    setActiveNoteId,
    createNote,
    updateNote,
    deleteNote,
    appendNamedResult,
    appendNamedResultToNewNote,
    exportNotesAsJson,
    importNotesFromJson,
    buildResultBlock,
  }
}
