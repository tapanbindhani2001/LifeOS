import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export function MiniCalendar({ highlightedDates = [] as string[] }: { highlightedDates?: string[] }) {
  const [cursor, setCursor] = useState(new Date())
  const monthStart = startOfMonth(cursor)
  const monthEnd = endOfMonth(cursor)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-ink-900">{format(cursor, 'MMMM yyyy')}</h3>
        <div className="flex gap-1">
          <button
            onClick={() => setCursor((c) => subMonths(c, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-500 hover:bg-surface-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCursor((c) => addMonths(c, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-500 hover:bg-surface-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1 text-[10px] font-semibold text-ink-300">
            {d}
          </span>
        ))}
        {days.map((day) => {
          const inMonth = isSameMonth(day, cursor)
          const today = isToday(day)
          const marked = highlightedDates.some((hd) => isSameDay(new Date(hd), day))
          return (
            <div key={day.toISOString()} className="flex items-center justify-center py-0.5">
              <button
                className={clsx(
                  'relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors',
                  !inMonth && 'text-ink-300',
                  inMonth && !today && 'text-ink-700 hover:bg-surface-muted',
                  today && 'bg-brand-500 text-white',
                )}
              >
                {format(day, 'd')}
                {marked && !today && (
                  <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-brand-500" />
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
