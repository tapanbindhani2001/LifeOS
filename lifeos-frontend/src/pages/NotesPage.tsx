import { useState, useEffect } from 'react'
import { Plus, Trash2, Pin, StickyNote, Search, Save } from 'lucide-react'
import { format } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import { ConfirmDialog, EmptyState, Skeleton } from '@/components/ui/Overlay'
import { useCreateNote, useDeleteNote, useNotes, useUpdateNote } from '@/hooks/useNotesCalendar'
import type { Note } from '@/types'

export default function NotesPage() {
  const { data: notes = [], isLoading } = useNotes()
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [deleting, setDeleting] = useState<Note | null>(null)

  const sorted = [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned)
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  const filtered = sorted.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
  )

  const selectedNote = notes.find((n) => n.id === selectedId) || null

  // Update editor inputs when selected note changes
  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title)
      setContent(selectedNote.content)
    } else {
      setTitle('')
      setContent('')
    }
  }, [selectedId, selectedNote])

  // Automatically select the first note if none is selected and notes are available
  useEffect(() => {
    if (!selectedId && filtered.length > 0) {
      setSelectedId(filtered[0].id)
    }
  }, [filtered, selectedId])

  const handleCreate = () => {
    createNote.mutate(
      { title: 'Untitled Note', content: '', pinned: false },
      {
        onSuccess: (data) => {
          setSelectedId(data.id)
        },
      }
    )
  }

  const handleSave = () => {
    if (!selectedNote) return
    updateNote.mutate({
      id: selectedNote.id,
      payload: { title: title.trim() || 'Untitled Note', content, pinned: selectedNote.pinned },
    })
  }

  const togglePin = () => {
    if (!selectedNote) return
    updateNote.mutate({
      id: selectedNote.id,
      payload: { title: selectedNote.title, content: selectedNote.content, pinned: !selectedNote.pinned },
    })
  }

  return (
    <AppLayout title="Notes" subtitle="Capture ideas, lists, and everything in between.">
      <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-surface-border bg-white shadow-card md:grid-cols-[300px_1fr] h-[calc(100vh-210px)] min-h-[500px]">
        {/* Left Column: Sidebar notes list */}
        <div className="flex flex-col border-r border-surface-border bg-surface-soft/40">
          {/* Sidebar Header & Search */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-ink-700">All Notes</h3>
              <button
                onClick={handleCreate}
                disabled={createNote.isPending}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
                aria-label="New Note"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-300" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes..."
                className="w-full rounded-lg border border-surface-border bg-white py-1.5 pl-9 pr-3 text-xs outline-none focus:border-brand-400"
              />
            </div>
          </div>

          {/* Notes List Scrollable */}
          <div className="flex-1 overflow-y-auto divide-y divide-surface-border">
            {isLoading && (
              <div className="p-4 space-y-3">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            )}

            {!isLoading && filtered.length === 0 && (
              <div className="p-8 text-center text-xs text-ink-400">No notes found</div>
            )}

            {!isLoading &&
              filtered.map((note) => {
                const isActive = note.id === selectedId
                const snippet = note.content
                  ? note.content.slice(0, 60) + (note.content.length > 60 ? '...' : '')
                  : 'No additional text'
                const formattedDate = format(new Date(note.updatedAt), 'MMM d, yyyy')

                return (
                  <button
                    key={note.id}
                    onClick={() => setSelectedId(note.id)}
                    className={`w-full text-left p-4 transition-colors flex flex-col gap-1 focus:outline-none ${
                      isActive
                        ? 'bg-brand-50/60 border-l-4 border-brand-500 pl-3'
                        : 'hover:bg-surface-muted/30 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-ink-900 truncate flex-1">
                        {note.title || 'Untitled Note'}
                      </span>
                      {note.pinned && (
                        <Pin className="h-3 w-3 text-brand-500 fill-brand-500 shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-ink-500 line-clamp-2 leading-relaxed">
                      {snippet}
                    </span>
                    <span className="text-[10px] text-ink-300 mt-1">{formattedDate}</span>
                  </button>
                )
              })}
          </div>
        </div>

        {/* Right Column: Note Editor Area */}
        <div className="flex flex-col bg-white">
          {selectedNote ? (
            <>
              {/* Editor Toolbar Header */}
              <div className="flex items-center justify-between border-b border-surface-border px-6 py-3.5 bg-surface-soft/20">
                <div className="text-xs text-ink-400 font-medium">
                  Last updated: {format(new Date(selectedNote.updatedAt), 'MMMM d, yyyy h:mm a')}
                </div>
                <div className="flex items-center gap-2">
                  {/* Pin Button */}
                  <button
                    onClick={togglePin}
                    className={`flex h-8 px-2.5 items-center gap-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      selectedNote.pinned
                        ? 'bg-brand-50 border-brand-200 text-brand-700'
                        : 'bg-white border-surface-border text-ink-600 hover:bg-surface-soft'
                    }`}
                    title={selectedNote.pinned ? 'Unpin note' : 'Pin note'}
                  >
                    <Pin className="h-3.5 w-3.5" fill={selectedNote.pinned ? 'currentColor' : 'none'} />
                    {selectedNote.pinned ? 'Pinned' : 'Pin'}
                  </button>

                  {/* Save Button */}
                  <button
                    onClick={handleSave}
                    disabled={updateNote.isPending}
                    className="flex h-8 px-2.5 items-center gap-1.5 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors"
                  >
                    <Save className="h-3.5 w-3.5" /> Save
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => setDeleting(selectedNote)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border bg-white text-ink-600 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-colors"
                    title="Delete note"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Editor Content Area */}
              <div className="flex-1 p-8 overflow-y-auto space-y-4">
                {/* Title Input */}
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Untitled Note"
                  className="w-full font-display text-2xl font-bold text-ink-900 border-none outline-none focus:ring-0 p-0 bg-transparent placeholder-ink-300"
                />

                {/* Content Textarea */}
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Start typing your thoughts here..."
                  className="w-full flex-1 border-none outline-none focus:ring-0 p-0 bg-transparent text-sm text-ink-700 placeholder-ink-300 resize-none min-h-[300px] h-[calc(100%-60px)]"
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <EmptyState
                icon={<StickyNote className="h-8 w-8 text-ink-300" />}
                title="No note selected"
                description="Choose a note from the sidebar or create a new one to start writing."
              />
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete note"
        description={`Delete "${deleting?.title}"? This can't be undone.`}
        onConfirm={() => {
          if (deleting) {
            deleteNote.mutate(deleting.id, {
              onSuccess: () => {
                setDeleting(null)
                setSelectedId(null)
              },
            })
          }
        }}
      />
    </AppLayout>
  )
}
