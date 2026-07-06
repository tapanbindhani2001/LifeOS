import { useState } from 'react'
import type { Task, TaskPriority, TaskRequest, TaskStatus } from '@/types'

export function TaskForm({
  initial,
  onSubmit,
  submitting,
}: {
  initial?: Task
  onSubmit: (payload: TaskRequest) => void
  submitting?: boolean
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? 'TODO')
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? 'MEDIUM')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [dueDate, setDueDate] = useState(initial?.dueDate?.slice(0, 10) ?? '')

  const handleSubmit = (e: React.FormEvent) => {
    console.log("SUBMITTING TASK FORM!", { title, status, priority, dueDate })
    e.preventDefault()
    onSubmit({
      title,
      description: description || undefined,
      status,
      priority,
      category: category || undefined,
      dueDate: dueDate ? `${dueDate}T00:00:00Z` : undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            <option value="TODO">To do</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="DONE">Done</option>
          </select>
        </div>
        <div>
          <label className="label">Priority</label>
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Category</label>
          <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Work, Personal…" />
        </div>
        <div>
          <label className="label">Due date</label>
          <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {initial ? 'Save changes' : 'Create task'}
      </button>
    </form>
  )
}
