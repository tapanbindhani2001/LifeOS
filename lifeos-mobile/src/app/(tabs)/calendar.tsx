import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, ActivityIndicator, Alert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { calendarApi } from '../../api/features'
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '../../constants/theme'
import Toast from 'react-native-toast-message'
import { router } from 'expo-router'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const isSameDay = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate()
}

export default function CalendarScreen() {
  const qc = useQueryClient()
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendar'],
    queryFn: calendarApi.list,
  })

  const createEvent = useMutation({
    mutationFn: calendarApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] })
      setModalOpen(false)
      setTitle('')
      setDescription('')
      setLocation('')
      Toast.show({ type: 'success', text1: 'Event created!' })
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e.message || 'Failed to create event' }),
  })

  const deleteEvent = useMutation({
    mutationFn: calendarApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] })
      Toast.show({ type: 'success', text1: 'Event deleted' })
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e.message || 'Failed to delete' }),
  })

  // Date states
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')

  // Date Picker States
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear())
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth())

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Generate calendar days
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDay = new Date(year, month, 1)
  const firstDayOfWeek = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const gridDays = []

  // Previous month prefix days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    gridDays.push({
      date: new Date(year, month - 1, daysInPrevMonth - i),
      isCurrentMonth: false,
    })
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    gridDays.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    })
  }

  // Next month suffix days
  const totalCells = gridDays.length
  const remaining = 7 - (totalCells % 7)
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      gridDays.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      })
    }
  }

  // Chunk grid into weeks
  const gridRows = []
  for (let i = 0; i < gridDays.length; i += 7) {
    gridRows.push(gridDays.slice(i, i + 7))
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  const handleCreate = () => {
    if (!title.trim()) {
      Toast.show({ type: 'error', text1: 'Title is required' })
      return
    }

    // YYYY-MM-DD
    const pad = (num: number) => String(num).padStart(2, '0')
    const dateStr = `${selectedDay.getFullYear()}-${pad(selectedDay.getMonth() + 1)}-${pad(selectedDay.getDate())}`
    const fullStart = `${dateStr}T${startTime}:00Z`
    const fullEnd = `${dateStr}T${endTime}:00Z`

    createEvent.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      startTime: fullStart,
      endTime: fullEnd,
    })
  }

  const handleDelete = (id: string) => {
    Alert.alert('Delete Event', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteEvent.mutate(id) },
    ])
  }

  // Filter events for selected day
  const selectedDayEvents = events.filter((e: any) => {
    if (!e.startTime) return false
    const eventDate = new Date(e.startTime)
    return isSameDay(eventDate, selectedDay)
  })

  const formatSelectedDate = (date: Date) => {
    return `${DAYS_OF_WEEK[date.getDay()]}, ${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Calendar</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalOpen(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity
            style={styles.monthLabelContainer}
            onPress={() => {
              setPickerYear(year)
              setPickerMonth(month)
              setDatePickerOpen(true)
            }}
          >
            <Text style={styles.monthLabel}>{MONTHS[month]} {year} ▾</Text>
          </TouchableOpacity>
          <View style={styles.navButtons}>
            <TouchableOpacity style={styles.navBtn} onPress={handlePrevMonth}>
              <Text style={styles.navBtnText}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={handleNextMonth}>
              <Text style={styles.navBtnText}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Calendar Grid Card */}
        <View style={styles.calendarCard}>
          {/* Weekday headers */}
          <View style={styles.weekdaysRow}>
            {WEEKDAYS.map(w => (
              <Text key={w} style={styles.weekdayText}>{w}</Text>
            ))}
          </View>

          {/* Grid rows */}
          {gridRows.map((row, rIdx) => (
            <View key={rIdx} style={styles.gridRow}>
              {row.map(dayObj => {
                const isSelected = isSameDay(dayObj.date, selectedDay)
                const isTodayDate = isSameDay(dayObj.date, new Date())
                const hasEvent = events.some((e: any) => e.startTime && isSameDay(new Date(e.startTime), dayObj.date))
                const isPastDay = dayObj.date.getTime() < today.getTime()

                return (
                  <TouchableOpacity
                    key={dayObj.date.toISOString()}
                    style={[
                      styles.dayCell,
                      isSelected && styles.daySelected,
                      !dayObj.isCurrentMonth && styles.dayOtherMonth,
                    ]}
                    onPress={() => setSelectedDay(dayObj.date)}
                  >
                    <View style={[styles.dayTextContainer, isTodayDate && styles.dayTodayContainer]}>
                      <Text style={[
                        styles.dayText,
                        isTodayDate && styles.dayTextToday,
                        isSelected && styles.dayTextSelected,
                        isPastDay && !isSelected && styles.dayTextPast,
                        !dayObj.isCurrentMonth && styles.dayTextOtherMonth,
                      ]}>
                        {dayObj.date.getDate()}
                      </Text>
                    </View>
                    {hasEvent && (
                      <View style={[styles.eventIndicator, isSelected && styles.eventIndicatorSelected]} />
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          ))}
        </View>

        {/* Day Events Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{formatSelectedDate(selectedDay)}</Text>
        </View>

        {/* Events list */}
        {isLoading ? (
          <ActivityIndicator color={Colors.brand[500]} style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.eventsList}>
            {selectedDayEvents.map((item: any) => (
              <View key={item.id} style={styles.eventCard}>
                <View style={styles.eventLeft}>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeText}>
                      {item.startTime ? new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    {item.description ? <Text style={styles.eventDesc}>{item.description}</Text> : null}
                    {item.location ? <Text style={styles.eventLoc}>📍 {item.location}</Text> : null}
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Text style={styles.deleteText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))}

            {selectedDayEvents.length === 0 && (
              <Text style={styles.empty}>No events scheduled.</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Date Picker Modal for Direct Month/Year Travel */}
      <Modal visible={datePickerOpen} transparent animationType="fade" onRequestClose={() => setDatePickerOpen(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Jump to Month/Year</Text>
              <TouchableOpacity onPress={() => setDatePickerOpen(false)}>
                <Text style={styles.pickerClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Year selector */}
            <View style={styles.yearRow}>
              <TouchableOpacity style={styles.yearBtn} onPress={() => setPickerYear(y => y - 1)}>
                <Text style={styles.yearBtnText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.yearText}>{pickerYear}</Text>
              <TouchableOpacity style={styles.yearBtn} onPress={() => setPickerYear(y => y + 1)}>
                <Text style={styles.yearBtnText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Months grid */}
            <View style={styles.monthsGrid}>
              {MONTHS_SHORT.map((m, idx) => {
                const isActive = pickerMonth === idx
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.monthChip, isActive && styles.monthChipActive]}
                    onPress={() => setPickerMonth(idx)}
                  >
                    <Text style={[styles.monthChipText, isActive && styles.monthChipTextActive]}>{m}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Apply button */}
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => {
                setCurrentMonth(new Date(pickerYear, pickerMonth, 1))
                setSelectedDay(new Date(pickerYear, pickerMonth, 1))
                setDatePickerOpen(false)
              }}
            >
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Event</Text>
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.label}>Selected Date</Text>
            <View style={styles.dateDisplay}>
              <Text style={styles.dateDisplayText}>{formatSelectedDate(selectedDay)}</Text>
            </View>

            <Text style={styles.label}>Title *</Text>
            <TextInput style={styles.input} placeholder="Birthday, Anniversary, Meeting..." value={title} onChangeText={setTitle} />

            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, { height: 72 }]} placeholder="Optional description..." multiline value={description} onChangeText={setDescription} />

            <Text style={styles.label}>Location</Text>
            <TextInput style={styles.input} placeholder="Optional location..." value={location} onChangeText={setLocation} />

            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Start Time (HH:MM)</Text>
                <TextInput style={styles.input} placeholder="09:00" value={startTime} onChangeText={setStartTime} />
              </View>
              <View style={{ width: 16 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>End Time (HH:MM)</Text>
                <TextInput style={styles.input} placeholder="10:00" value={endTime} onChangeText={setEndTime} />
              </View>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={createEvent.isPending}>
              {createEvent.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Event</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface.soft },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backArrow: { fontSize: 22, color: Colors.ink[900], paddingRight: 4 },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.ink[900] },
  addBtn: {
    backgroundColor: Colors.brand[500],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  scrollContent: { padding: Spacing.lg, paddingBottom: 40 },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  monthLabelContainer: {
    paddingVertical: 4,
  },
  monthLabel: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.ink[900] },
  navButtons: { flexDirection: 'row', gap: Spacing.xs },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  navBtnText: { fontSize: FontSize.lg, color: Colors.ink[700], fontWeight: '600' },
  calendarCard: {
    backgroundColor: Colors.surface.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    ...Shadow.sm,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.sm,
  },
  weekdayText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.ink[400],
    width: '14.2%',
    textAlign: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  dayCell: {
    width: '13%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    position: 'relative',
  },
  daySelected: {
    borderColor: Colors.brand[500],
    backgroundColor: Colors.brand[50] + '30',
  },
  dayOtherMonth: {
    opacity: 0.3,
  },
  dayTextContainer: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
  },
  dayTodayContainer: {
    backgroundColor: Colors.brand[500],
  },
  dayText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.ink[900],
    textAlign: 'center',
  },
  dayTextToday: {
    color: '#fff',
  },
  dayTextSelected: {
    color: Colors.brand[500],
    fontWeight: '800',
  },
  dayTextPast: {
    color: Colors.ink[300],
    fontWeight: '500',
  },
  dayTextOtherMonth: {
    color: Colors.ink[400],
  },
  eventIndicator: {
    width: 4,
    height: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.brand[500],
    position: 'absolute',
    bottom: 4,
  },
  eventIndicatorSelected: {
    backgroundColor: Colors.brand[500],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.ink[900],
  },
  eventsList: {
    marginBottom: Spacing.xl,
  },
  eventCard: {
    backgroundColor: Colors.surface.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadow.sm,
  },
  eventLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  timeBlock: {
    backgroundColor: Colors.brand[50],
    borderRadius: BorderRadius.md,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  timeText: {
    color: Colors.brand[700],
    fontWeight: '700',
    fontSize: FontSize.xs,
  },
  eventTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.ink[900],
  },
  eventDesc: {
    fontSize: FontSize.xs,
    color: Colors.ink[500],
    marginTop: 2,
  },
  eventLoc: {
    fontSize: FontSize.xs,
    color: Colors.ink[400],
    marginTop: 4,
    fontWeight: '500',
  },
  deleteText: {
    fontSize: 16,
    padding: 4,
  },
  empty: {
    textAlign: 'center',
    color: Colors.ink[400],
    marginTop: 20,
    fontSize: FontSize.sm,
  },
  modal: {
    flex: 1,
    padding: Spacing.xl,
    backgroundColor: Colors.surface.soft,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.ink[900],
  },
  modalClose: {
    fontSize: 20,
    color: Colors.ink[500],
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.ink[700],
    marginBottom: 6,
    marginTop: Spacing.sm,
  },
  dateDisplay: {
    backgroundColor: Colors.surface.white,
    borderWidth: 1.5,
    borderColor: Colors.ink[200],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    marginBottom: Spacing.sm,
  },
  dateDisplayText: {
    fontSize: FontSize.md,
    color: Colors.ink[700],
    fontWeight: '700',
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.ink[200],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: Colors.ink[900],
    backgroundColor: Colors.surface.white,
    marginBottom: Spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  submitBtn: {
    backgroundColor: Colors.brand[500],
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  // Year/Month Picker Styles
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  pickerContent: {
    backgroundColor: Colors.surface.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 320,
    ...Shadow.md,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  pickerTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.ink[900],
  },
  pickerClose: {
    fontSize: 18,
    color: Colors.ink[500],
  },
  yearRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.sm,
    backgroundColor: Colors.surface.soft,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
  },
  yearBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  yearBtnText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.brand[500],
  },
  yearText: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.ink[900],
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginVertical: Spacing.md,
  },
  monthChip: {
    width: '30%',
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface.soft,
    alignItems: 'center',
    marginBottom: 4,
  },
  monthChipActive: {
    backgroundColor: Colors.brand[500],
  },
  monthChipText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.ink[700],
  },
  monthChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  applyBtn: {
    backgroundColor: Colors.brand[500],
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  applyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FontSize.md,
  },
})
