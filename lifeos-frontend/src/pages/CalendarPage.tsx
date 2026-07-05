import { useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, Trash2, Clock, MapPin } from 'lucide-react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import clsx from 'clsx'
import { AppLayout } from '@/components/layout/AppLayout'
import { Modal, ConfirmDialog } from '@/components/ui/Overlay'
import { useCalendarEvents, useCreateEvent, useDeleteEvent } from '@/hooks/useNotesCalendar'
import type { CalendarEvent, CalendarEventRequest } from '@/types'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarPage() {
  const [cursor, setCursor] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date())
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<CalendarEvent | null>(null)

  const { data: events = [] } = useCalendarEvents()
  const createEvent = useCreateEvent()
  const deleteEvent = useDeleteEvent()

  const monthStart = startOfMonth(cursor)
  const monthEnd = endOfMonth(cursor)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  // CalendarEvent uses startTime / endTime (ISO strings)
  const eventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(new Date(e.startTime), day))
  const selectedDayEvents = selectedDay ? eventsForDay(selectedDay) : []

  return (
    <AppLayout title="Calendar" subtitle="Plan your days, weeks, and everything in between.">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-lg font-bold text-ink-900">{format(cursor, 'MMMM yyyy')}</h2>
          <div className="flex gap-1">
            <button
              onClick={() => setCursor((c) => subMonths(c, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-surface-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCursor((c) => addMonths(c, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-surface-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <button onClick={() => setFormOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> New Event
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Month grid */}
        <div className="card overflow-hidden p-4">
          <div className="mb-2 grid grid-cols-7 text-center text-xs font-semibold text-ink-500">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-2">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((day) => {
              const inMonth = isSameMonth(day, cursor)
              const dayEvents = eventsForDay(day)
              const selected = selectedDay && isSameDay(day, selectedDay)
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={clsx(
                    'flex min-h-20 flex-col items-start gap-1 rounded-xl border p-2 text-left transition-colors',
                    inMonth ? 'border-surface-border bg-white' : 'border-transparent bg-surface-soft/60 text-ink-300',
                    selected && 'border-brand-400 ring-2 ring-brand-100',
                  )}
                >
                  <span
                    className={clsx(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                      isToday(day) && 'bg-brand-500 text-white',
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  <div className="w-full space-y-0.5">
                    {dayEvents.slice(0, 2).map((e) => (
                      <div
                        key={e.id}
                        className="truncate rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700"
                      >
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <p className="text-[10px] text-ink-500">+{dayEvents.length - 2} more</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Day detail panel */}
        <div className="card p-5">
          <h3 className="mb-4 font-display text-base font-bold text-ink-900">
            {selectedDay ? format(selectedDay, 'EEEE, MMM d') : 'Select a day'}
          </h3>
          {selectedDayEvents.length === 0 ? (
            <p className="text-sm text-ink-500">No events scheduled.</p>
          ) : (
            <div className="space-y-3">
              {selectedDayEvents.map((event) => (
                <div key={event.id} className="group rounded-xl border border-surface-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-900">{event.title}</p>
                    <button
                      onClick={() => setDeleting(event)}
                      className="rounded-md p-1 text-ink-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
                    <Clock className="h-3 w-3" />
                    {format(new Date(event.startTime), 'hh:mm a')} – {format(new Date(event.endTime), 'hh:mm a')}
                  </p>
                  {event.location && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
                      <MapPin className="h-3 w-3" /> {event.location}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="New Event">
        <EventForm
          defaultDate={selectedDay ?? new Date()}
          submitting={createEvent.isPending}
          onSubmit={(payload) => createEvent.mutate(payload, { onSuccess: () => setFormOpen(false) })}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete event"
        description={`Remove "${deleting?.title}" from your calendar?`}
        onConfirm={() => deleting && deleteEvent.mutate(deleting.id)}
      />
    </AppLayout>
  )
}

function EventForm({
  defaultDate,
  onSubmit,
  submitting,
}: {
  defaultDate: Date
  onSubmit: (p: CalendarEventRequest) => void
  submitting?: boolean
}) {
  const dateStr = format(defaultDate, 'yyyy-MM-dd')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      title,
      description: description || undefined,
      location: location || undefined,
      startTime: `${dateStr}T${startTime}:00`,
      endTime: `${dateStr}T${endTime}:00`,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Event title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Start time</label>
          <input type="time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div>
          <label className="label">End time</label>
          <input type="time" className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Location</label>
        <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        Create event
      </button>
    </form>
  )
}
