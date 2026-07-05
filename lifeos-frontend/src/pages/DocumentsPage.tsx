import { useRef, useState } from 'react'
import { Upload, FileText, Download, Trash2, File } from 'lucide-react'
import { format } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import { ConfirmDialog, EmptyState, Skeleton } from '@/components/ui/Overlay'
import { useDeleteDocument, useDocuments, useUploadDocument } from '@/hooks/usePlatform'
import { documentsApi } from '@/api/platform'
import type { DocumentMeta } from '@/types'

const MAX_SIZE = 10 * 1024 * 1024

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentsPage() {
  const { data: documents = [], isLoading } = useDocuments()
  const upload = useUploadDocument()
  const remove = useDeleteDocument()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [deleting, setDeleting] = useState<DocumentMeta | null>(null)

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (file.size > MAX_SIZE) {
      alert('File exceeds the 10MB limit.')
      return
    }
    upload.mutate(file)
  }

  return (
    <AppLayout title="Documents" subtitle="Store and access your important files, securely.">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={`mb-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver
            ? 'border-brand-400 bg-brand-50'
            : 'border-surface-border bg-white hover:bg-surface-soft'
        }`}
      >
        <input ref={inputRef} type="file" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-500">
          <Upload className="h-6 w-6" />
        </div>
        <p className="font-medium text-ink-900">Drag & drop a file, or click to browse</p>
        <p className="mt-1 text-sm text-ink-500">
          Max file size 10MB · {upload.isPending ? 'Uploading…' : 'PDF, images, docs supported'}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No documents yet"
          description="Upload a file to get started."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <div key={doc.id} className="card group flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-ink-500">
                <File className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">{doc.fileName}</p>
                <p className="text-xs text-ink-500">
                  {/* fileSize and createdAt match the DocumentMeta type */}
                  {formatBytes(doc.fileSize)} · {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                </p>
              </div>
              <a
                href={documentsApi.downloadUrl(doc.id)}
                className="rounded-md p-1.5 text-ink-400 hover:bg-surface-muted hover:text-brand-600"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                onClick={() => setDeleting(doc)}
                className="rounded-md p-1.5 text-ink-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete document"
        description={`Delete "${deleting?.fileName}"? This can't be undone.`}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </AppLayout>
  )
}
