import { useState } from 'react'
import { Plus, MoreVertical, Trash2, Calendar as CalendarIcon, ListTodo } from 'lucide-react'
import { format } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import { Modal, ConfirmDialog, EmptyState, Skeleton } from '@/components/ui/Overlay'
import { TaskForm } from '@/components/tasks/TaskForm'
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from '@/hooks/useTasks'
import { priorityBadgeClass } from '@/lib/format'
import type { Task, TaskRequest, TaskStatus } from '@/types'

const COLUMNS: { key: TaskStatus; label: string; accent: string }[] = [
  { key: 'TODO', label: 'To Do', accent: 'bg-ink-300' },
  { key: 'IN_PROGRESS', label: 'In Progress', accent: 'bg-blue-500' },
  { key: 'DONE', label: 'Done', accent: 'bg-emerald-500' },
]

export default function TasksPage() {
  const { data: tasks = [], isLoading } = useTasks()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState<Task | null>(null)
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (task: Task) => {
    setEditing(task)
    setFormOpen(true)
    setMenuFor(null)
  }

  const handleSubmit = (payload: TaskRequest) => {
    if (editing) {
      updateTask.mutate({ id: editing.id, payload }, { onSuccess: () => setFormOpen(false) })
    } else {
      createTask.mutate(payload, { onSuccess: () => setFormOpen(false) })
    }
  }

  const moveTask = (task: Task, status: TaskStatus) => {
    if (task.status === status) return
    updateTask.mutate({
      id: task.id,
      payload: {
        title: task.title,
        description: task.description,
        status,
        priority: task.priority,
        category: task.category,
        dueDate: task.dueDate,
      },
    })
  }

  return (
    <AppLayout title="Tasks" subtitle="Organize your work with a drag-and-drop board.">
      <div className="mb-5 flex justify-end">
        <button onClick={openCreate} className="btn-primary">
          <Plus className="h-4 w-4" /> New Task
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<ListTodo className="h-6 w-6" />}
          title="No tasks yet"
          description="Create your first task to start tracking your work."
          action={
            <button onClick={openCreate} className="btn-primary">
              <Plus className="h-4 w-4" /> New Task
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key)
            return (
              <div
                key={col.key}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOverCol(col.key)
                }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData('text/task-id')
                  const task = tasks.find((t) => t.id === id)
                  if (task) moveTask(task, col.key)
                  setDragOverCol(null)
                }}
                className={`flex flex-col rounded-2xl border border-surface-border bg-surface-muted/50 p-3 transition-colors ${
                  dragOverCol === col.key ? 'bg-brand-50' : ''
                }`}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                    <span className={`h-2 w-2 rounded-full ${col.accent}`} />
                    {col.label}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-ink-500">
                    {colTasks.length}
                  </span>
                </div>

                <div className="min-h-[120px] space-y-2.5">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/task-id', task.id)}
                      onClick={() => openEdit(task)}
                      className="group card relative cursor-grab space-y-2 p-3.5 active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-ink-900">{task.title}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuFor(menuFor === task.id ? null : task.id)
                          }}
                          className="rounded-md p-1 text-ink-300 opacity-0 hover:bg-surface-muted group-hover:opacity-100"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                        {menuFor === task.id && (
                          <div
                            className="absolute right-2 top-9 z-10 w-32 rounded-lg border border-surface-border bg-white p-1 shadow-popover"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                setDeleting(task)
                                setMenuFor(null)
                              }}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                      {task.description && (
                        <p className="line-clamp-2 text-xs text-ink-500">{task.description}</p>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <span className={`badge ${priorityBadgeClass(task.priority)}`}>{task.priority}</span>
                        {task.dueDate && (
                          <span className="flex items-center gap-1 text-[11px] text-ink-500">
                            <CalendarIcon className="h-3 w-3" />
                            {format(new Date(task.dueDate), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Task' : 'New Task'}>
        <TaskForm
          initial={editing ?? undefined}
          submitting={createTask.isPending || updateTask.isPending}
          onSubmit={handleSubmit}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete task"
        description={`Are you sure you want to delete "${deleting?.title}"? This can't be undone.`}
        onConfirm={() => deleting && deleteTask.mutate(deleting.id)}
      />
    </AppLayout>
  )
}
