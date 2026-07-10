import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, ActivityIndicator, Alert, Platform
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { calendarApi } from '../../api/features'
import { Spacing, BorderRadius, FontSize, Shadow } from '../../constants/theme'
import { useTheme, makeStyles } from '../../context/ThemeContext'
import Toast from 'react-native-toast-message'
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Custom Dynamic Icon sets replacing raw Emojis
type IconName = 'plus' | 'trash' | 'clock' | 'map-pin' | 'chevron-left' | 'chevron-right' | 'calendar'

function Icon({ name, color = '#6d4df2', size = 16 }: { name: IconName; color?: string; size?: number }) {
  switch (name) {
    case 'plus':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <Line x1={12} y1={5} x2={12} y2={19} />
          <Line x1={5} y1={12} x2={19} y2={12} />
        </Svg>
      )
    case 'trash':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Line x1={3} y1={6} x2={21} y2={6} />
          <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <Line x1={10} y1={11} x2={10} y2={17} />
          <Line x1={14} y1={11} x2={14} y2={17} />
        </Svg>
      )
    case 'clock':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx={12} cy={12} r={10} />
          <Path d="M12 6v6l4 2" />
        </Svg>
      )
    case 'map-pin':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <Circle cx={12} cy={10} r={3} />
        </Svg>
      )
    case 'calendar':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Rect x={3} y={4} width={18} height={18} rx={2} ry={2} />
          <Line x1={16} y1={2} x2={16} y2={6} />
          <Line x1={8} y1={2} x2={8} y2={6} />
          <Line x1={3} y1={10} x2={21} y2={10} />
        </Svg>
      )
    case 'chevron-left':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M15 18l-6-6 6-6" />
        </Svg>
      )
    case 'chevron-right':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M9 18l6-6-6-6" />
        </Svg>
      )
  }
}

const isSameDay = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate()
}

export default function CalendarScreen() {
  const qc = useQueryClient()
  const { colors, theme } = useTheme()
  const styles = useStyles()
  const isDark = theme === 'dark'

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

  // Date and View states
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
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

  // Generate calendar days (Month View)
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

  // Generate 7 days of the week containing selectedDay (Week View)
  const getDaysOfWeek = (date: Date) => {
    const current = new Date(date)
    const day = current.getDay() // 0 = Sun, 1 = Mon ...
    const diff = current.getDate() - day // adjust to Sunday
    const startOfWeek = new Date(current.setDate(diff))
    
    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      days.push(d)
    }
    return days
  }

  const weekDaysList = getDaysOfWeek(selectedDay)

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentMonth(new Date(year, month - 1, 1))
    } else {
      const newDate = new Date(selectedDay)
      newDate.setDate(selectedDay.getDate() - 7)
      setSelectedDay(newDate)
      setCurrentMonth(newDate)
    }
  }

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentMonth(new Date(year, month + 1, 1))
    } else {
      const newDate = new Date(selectedDay)
      newDate.setDate(selectedDay.getDate() + 7)
      setSelectedDay(newDate)
      setCurrentMonth(newDate)
    }
  }

  const handleCreate = () => {
    if (!title.trim()) {
      Toast.show({ type: 'error', text1: 'Title is required' })
      return
    }

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
    Alert.alert('Delete Event', 'Are you sure you want to remove this event?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteEvent.mutate(id) },
    ])
  }

  const isEventNow = (item: any) => {
    if (!item.startTime || !item.endTime) return false
    const now = new Date()
    const start = new Date(item.startTime)
    const end = new Date(item.endTime)
    return now >= start && now <= end
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
          <Icon name="plus" color="#fff" size={14} />
          <Text style={styles.addBtnText}>Add Event</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Month Navigation & View Controller Row */}
        <View style={styles.monthNav}>
          <TouchableOpacity
            style={styles.monthLabelContainer}
            onPress={() => {
              setPickerYear(year)
              setPickerMonth(month)
              setDatePickerOpen(true)
            }}
          >
            <Text style={styles.monthLabel}>
              {viewMode === 'month' ? `${MONTHS[month]} ${year}` : `${MONTHS[selectedDay.getMonth()]} ${selectedDay.getFullYear()}`} ▾
            </Text>
          </TouchableOpacity>
          <View style={styles.navButtons}>
            <TouchableOpacity style={styles.navBtn} onPress={handlePrev}>
              <Icon name="chevron-left" color={colors.ink[700]} size={16} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={handleNext}>
              <Icon name="chevron-right" color={colors.ink[700]} size={16} />
            </TouchableOpacity>
          </View>
        </View>

        {/* View Mode Toggle Option (Month/Week toggle) */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'month' && styles.toggleBtnActive]}
              onPress={() => setViewMode('month')}
            >
              <Text style={[styles.toggleBtnText, viewMode === 'month' && styles.toggleBtnTextActive]}>Month</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'week' && styles.toggleBtnActive]}
              onPress={() => setViewMode('week')}
            >
              <Text style={[styles.toggleBtnText, viewMode === 'week' && styles.toggleBtnTextActive]}>Week</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.todayBtn}
            onPress={() => {
              setCurrentMonth(new Date())
              setSelectedDay(new Date())
            }}
          >
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        </View>

        {/* Calendar Grid Card */}
        <View style={styles.calendarCard}>
          {viewMode === 'month' ? (
            <>
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
                        onPress={() => {
                          setSelectedDay(dayObj.date)
                          if (!dayObj.isCurrentMonth) {
                            setCurrentMonth(dayObj.date)
                          }
                        }}
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
            </>
          ) : (
            /* Advanced Week Strip View */
            <View style={styles.weekStripContainer}>
              <View style={styles.weekdaysRow}>
                {WEEKDAYS.map(w => (
                  <Text key={w} style={styles.weekdayText}>{w}</Text>
                ))}
              </View>
              <View style={styles.gridRow}>
                {weekDaysList.map(weekDay => {
                  const isSelected = isSameDay(weekDay, selectedDay)
                  const isTodayDate = isSameDay(weekDay, new Date())
                  const hasEvent = events.some((e: any) => e.startTime && isSameDay(new Date(e.startTime), weekDay))
                  const isPastDay = weekDay.getTime() < today.getTime()

                  return (
                    <TouchableOpacity
                      key={weekDay.toISOString()}
                      style={[
                        styles.dayCell,
                        isSelected && styles.daySelected,
                      ]}
                      onPress={() => setSelectedDay(weekDay)}
                    >
                      <View style={[styles.dayTextContainer, isTodayDate && styles.dayTodayContainer]}>
                        <Text style={[
                          styles.dayText,
                          isTodayDate && styles.dayTextToday,
                          isSelected && styles.dayTextSelected,
                          isPastDay && !isSelected && styles.dayTextPast,
                        ]}>
                          {weekDay.getDate()}
                        </Text>
                      </View>
                      {hasEvent && (
                        <View style={[styles.eventIndicator, isSelected && styles.eventIndicatorSelected]} />
                      )}
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          )}
        </View>

        {/* Selected Day Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{formatSelectedDate(selectedDay)}</Text>
        </View>

        {/* Timeline Events list */}
        {isLoading ? (
          <ActivityIndicator color={colors.brand[500]} style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.timelineContainer}>
            {selectedDayEvents.map((item: any, idx: number) => {
              const isNow = isEventNow(item)
              return (
                <View key={item.id} style={styles.timelineRow}>
                  {/* Left Side: Time indicator */}
                  <View style={styles.timelineTimeBlock}>
                    <Text style={[styles.timelineTimeText, isNow && styles.timelineTimeTextNow]}>
                      {item.startTime ? new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </Text>
                  </View>

                  {/* Middle Line: Timeline Node dots */}
                  <View style={styles.timelineNodeBlock}>
                    <View style={[styles.timelineDot, isNow && styles.timelineDotNow]} />
                    {idx < selectedDayEvents.length - 1 && <View style={styles.timelineLine} />}
                  </View>

                  {/* Right Side: Beautiful Card item */}
                  <View style={[styles.timelineCard, isNow && styles.timelineCardNow]}>
                    <View style={styles.cardHeader}>
                      <Text style={[styles.eventTitle, isNow && styles.eventTitleNow]}>{item.title}</Text>
                      {isNow && (
                        <View style={styles.nowBadge}>
                          <Text style={styles.nowBadgeText}>NOW</Text>
                        </View>
                      )}
                    </View>
                    
                    {item.description ? <Text style={styles.eventDesc}>{item.description}</Text> : null}
                    
                    {item.location || item.startTime ? (
                      <View style={styles.eventMetaRow}>
                        {item.startTime && (
                          <View style={styles.metaItem}>
                            <Icon name="clock" color={isDark ? colors.brand[300] : colors.brand[500]} size={12} />
                            <Text style={styles.metaText}>
                              {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {item.endTime ? new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'End'}
                            </Text>
                          </View>
                        )}
                        {item.location && (
                          <View style={styles.metaItem}>
                            <Icon name="map-pin" color={colors.ink[400]} size={12} />
                            <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
                          </View>
                        )}
                      </View>
                    ) : null}

                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                      <Icon name="trash" color={colors.status.error} size={14} />
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })}

            {selectedDayEvents.length === 0 && (
              <View style={styles.emptyCard}>
                <Icon name="calendar" color={colors.ink[300]} size={36} />
                <Text style={styles.empty}>No events scheduled for this day.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Date Picker Modal for Direct Jump */}
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

      {/* Create Event Modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Event</Text>
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.modalLabel}>Selected Date</Text>
            <View style={styles.dateDisplay}>
              <Text style={styles.dateDisplayText}>{formatSelectedDate(selectedDay)}</Text>
            </View>

            <Text style={styles.modalLabel}>Title *</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Birthday, anniversary, meeting..."
              placeholderTextColor={colors.ink[400]}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={[styles.inputField, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Add details, notes, description..."
              placeholderTextColor={colors.ink[400]}
              multiline
              value={description}
              onChangeText={setDescription}
            />

            <Text style={styles.modalLabel}>Location</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Office, home, coffee shop..."
              placeholderTextColor={colors.ink[400]}
              value={location}
              onChangeText={setLocation}
            />

            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Start Time</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="09:00"
                  placeholderTextColor={colors.ink[400]}
                  value={startTime}
                  onChangeText={setStartTime}
                />
              </View>
              <View style={{ width: 16 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>End Time</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="10:00"
                  placeholderTextColor={colors.ink[400]}
                  value={endTime}
                  onChangeText={setEndTime}
                />
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

const useStyles = makeStyles((colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface.soft },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: colors.ink[900], fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium' },
  addBtn: {
    backgroundColor: colors.brand[500],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...Shadow.sm,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium' },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: 60 },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  monthLabelContainer: {
    paddingVertical: 4,
  },
  monthLabel: { fontSize: FontSize.lg, fontWeight: '800', color: colors.ink[900], fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium' },
  navButtons: { flexDirection: 'row', gap: Spacing.xs },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.surface.white,
    borderWidth: 1,
    borderColor: colors.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },

  // Toggle View Row styles
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface.white,
    borderRadius: BorderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  toggleBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  toggleBtnActive: {
    backgroundColor: colors.brand[50],
  },
  toggleBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: colors.ink[500],
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  toggleBtnTextActive: {
    color: colors.brand[600],
    fontWeight: '700',
  },
  todayBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.surface.white,
    borderWidth: 1,
    borderColor: colors.surface.border,
    ...Shadow.sm,
  },
  todayBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: colors.ink[700],
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },

  calendarCard: {
    backgroundColor: colors.surface.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    ...Shadow.sm,
  },
  weekStripContainer: {
    paddingVertical: 4,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.sm,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.ink[400],
    width: '14.2%',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
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
    backgroundColor: colors.brand[500],
    borderRadius: 9999,
  },
  dayOtherMonth: {
    opacity: 0.3,
  },
  dayTextContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
  },
  dayTodayContainer: {
    backgroundColor: colors.brand[400],
    borderRadius: 9999,
  },
  dayText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: colors.ink[900],
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  dayTextToday: {
    color: '#fff',
    fontWeight: '800',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '800',
  },
  dayTextPast: {
    color: colors.ink[300],
    fontWeight: '500',
  },
  dayTextOtherMonth: {
    color: colors.ink[400],
  },
  eventIndicator: {
    width: 4,
    height: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.brand[500],
    position: 'absolute',
    bottom: 3,
  },
  eventIndicatorSelected: {
    backgroundColor: colors.brand[600],
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
    color: colors.ink[900],
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },

  // Advanced Timeline Agenda list styles
  timelineContainer: {
    marginBottom: Spacing.xl,
    paddingLeft: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 0,
    minHeight: 88,
  },
  timelineTimeBlock: {
    width: 65,
    paddingTop: 12,
    alignItems: 'flex-start',
  },
  timelineTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink[500],
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  timelineTimeTextNow: {
    color: colors.brand[600],
    fontWeight: '800',
  },
  timelineNodeBlock: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.ink[200],
    marginTop: 15,
    borderWidth: 2,
    borderColor: colors.surface.soft,
    zIndex: 2,
  },
  timelineDotNow: {
    backgroundColor: colors.brand[500],
    width: 12,
    height: 12,
    borderWidth: 2,
    borderColor: '#fff',
    transform: [{ scale: 1.2 }],
    shadowColor: colors.brand[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  timelineLine: {
    position: 'absolute',
    top: 25,
    bottom: -15,
    width: 2,
    backgroundColor: colors.surface.border,
    zIndex: 1,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: colors.surface.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    position: 'relative',
    ...Shadow.sm,
  },
  timelineCardNow: {
    borderColor: colors.brand[300],
    backgroundColor: colors.brand[50] + '12',
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: colors.ink[900],
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  eventTitleNow: {
    color: colors.brand[600],
  },
  nowBadge: {
    backgroundColor: colors.brand[500],
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  nowBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  eventDesc: {
    fontSize: FontSize.xs,
    color: colors.ink[500],
    lineHeight: 18,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  eventMetaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.ink[500],
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    maxWidth: 120,
  },
  deleteBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    padding: 2,
  },
  emptyCard: {
    backgroundColor: colors.surface.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  empty: {
    textAlign: 'center',
    color: colors.ink[400],
    fontSize: FontSize.sm,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },

  // Modal styles
  modal: {
    flex: 1,
    padding: Spacing.xl,
    backgroundColor: colors.surface.soft,
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
    color: colors.ink[900],
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  modalClose: {
    fontSize: 20,
    color: colors.ink[500],
  },
  modalLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: colors.ink[700],
    marginBottom: 6,
    marginTop: Spacing.sm,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  dateDisplay: {
    backgroundColor: colors.surface.white,
    borderWidth: 1.5,
    borderColor: colors.surface.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    marginBottom: Spacing.sm,
  },
  dateDisplayText: {
    fontSize: FontSize.md,
    color: colors.ink[700],
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  inputField: {
    borderWidth: 1.5,
    borderColor: colors.surface.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: colors.ink[900],
    backgroundColor: colors.surface.white,
    marginBottom: Spacing.sm,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  submitBtn: {
    backgroundColor: colors.brand[500],
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.xl,
    ...Shadow.sm,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FontSize.md,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },

  // Picker modal styles
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  pickerContent: {
    backgroundColor: colors.surface.white,
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
    color: colors.ink[900],
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  pickerClose: {
    fontSize: 18,
    color: colors.ink[500],
  },
  yearRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.sm,
    backgroundColor: colors.surface.soft,
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
    color: colors.brand[500],
  },
  yearText: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: colors.ink[900],
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
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
    backgroundColor: colors.surface.soft,
    alignItems: 'center',
    marginBottom: 4,
  },
  monthChipActive: {
    backgroundColor: colors.brand[500],
  },
  monthChipText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: colors.ink[700],
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  monthChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  applyBtn: {
    backgroundColor: colors.brand[500],
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: Spacing.xs,
    ...Shadow.sm,
  },
  applyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FontSize.md,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
}))
