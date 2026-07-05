import { useState } from 'react'
import { Plus, Trash2, Pin, StickyNote } from 'lucide-react'
import { format } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import { Modal, ConfirmDialog, EmptyState, Skeleton } from '@/components/ui/Overlay'
import { useCreateNote, useDeleteNote, useNotes, useUpdateNote } from '@/hooks/useNotesCalendar'
import type { Note, NoteRequest } from '@/types'

export default function NotesPage() {
  const { data: notes = [], isLoading } = useNotes()
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Note | null>(null)
  const [deleting, setDeleting] = useState<Note | null>(null)

  const sorted = [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned))

  const openEdit = (note: Note) => {
    setEditing(note)
    setFormOpen(true)
  }

  const handleSubmit = (payload: NoteRequest) => {
    if (editing) {
      updateNote.mutate({ id: editing.id, payload }, { onSuccess: () => setFormOpen(false) })
    } else {
      createNote.mutate(payload, { onSuccess: () => setFormOpen(false) })
    }
  }

  return (
    <AppLayout title="Notes" subtitle="Capture ideas, lists, and everything in between.">
      <div className="mb-5 flex justify-end">
        <button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          className="btn-primary"
        >
          <Plus className="h-4 w-4" /> New Note
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<StickyNote className="h-6 w-6" />}
          title="No notes yet"
          description="Jot down your first idea."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((note) => (
            <div
              key={note.id}
              onClick={() => openEdit(note)}
              className="card group relative cursor-pointer p-5"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="line-clamp-1 font-display text-base font-bold text-ink-900">{note.title}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    updateNote.mutate({
                      id: note.id,
                      payload: { title: note.title, content: note.content, pinned: !note.pinned },
                    })
                  }}
                  className={`rounded-md p-1 ${
                    note.pinned ? 'text-brand-500' : 'text-ink-300 opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <Pin className="h-3.5 w-3.5" fill={note.pinned ? 'currentColor' : 'none'} />
                </button>
              </div>
              <p className="line-clamp-4 text-sm text-ink-500">{note.content}</p>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-ink-300">{format(new Date(note.updatedAt), 'MMM d, yyyy')}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleting(note)
                  }}
                  className="rounded-md p-1 text-ink-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Note' : 'New Note'} width="max-w-lg">
        <NoteForm
          initial={editing ?? undefined}
          submitting={createNote.isPending || updateNote.isPending}
          onSubmit={handleSubmit}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete note"
        description={`Delete "${deleting?.title}"? This can't be undone.`}
        onConfirm={() => deleting && deleteNote.mutate(deleting.id)}
      />
    </AppLayout>
  )
}

function NoteForm({
  initial,
  onSubmit,
  submitting,
}: {
  initial?: Note
  onSubmit: (p: NoteRequest) => void
  submitting?: boolean
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ title, content, pinned: initial?.pinned })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
      </div>
      <div>
        <label className="label">Content</label>
        <textarea className="input min-h-40" value={content} onChange={(e) => setContent(e.target.value)} required />
      </div>
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {initial ? 'Save changes' : 'Create note'}
      </button>
    </form>
  )
}
