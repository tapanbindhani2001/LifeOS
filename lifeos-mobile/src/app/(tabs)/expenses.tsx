import { useState, useEffect } from 'react'
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Alert, Platform, KeyboardAvoidingView, ScrollView
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Svg, { G, Circle } from 'react-native-svg'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as Clipboard from 'expo-clipboard'
import { expensesApi } from '../../api/features'
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '../../constants/theme'
import Toast from 'react-native-toast-message'
import { parseBankSms } from '../../utils/smsParser'

const CATEGORIES = ['FOOD', 'RENT', 'TRANSPORT', 'SHOPPING', 'BILLS', 'ENTERTAINMENT', 'HEALTH', 'OTHER']
const CATEGORY_LABELS: Record<string, string> = {
  FOOD: 'Food', RENT: 'Rent', TRANSPORT: 'Transport',
  SHOPPING: 'Shopping', BILLS: 'Bills', ENTERTAINMENT: 'Entertainment',
  HEALTH: 'Health', OTHER: 'Other',
}

const CATEGORY_COLORS: Record<string, string> = {
  FOOD: '#10B981', // emerald
  RENT: '#3B82F6', // blue
  TRANSPORT: '#F59E0B', // amber
  SHOPPING: '#EC4899', // pink
  BILLS: '#EF4444', // red
  ENTERTAINMENT: '#8B5CF6', // violet
  HEALTH: '#06B6D4', // cyan
  OTHER: '#6B7280', // gray
}

import { PermissionsAndroid } from 'react-native'
import SmsAndroid from 'react-native-get-sms-android'

export default function ExpensesScreen() {
  const qc = useQueryClient()
  const { data: expenses = [], isLoading: listLoading } = useQuery({ queryKey: ['expenses'], queryFn: expensesApi.list })
  const { data: summary, isLoading: summaryLoading } = useQuery({ queryKey: ['expenses', 'summary'], queryFn: expensesApi.summary })

  const createExpense = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['expenses', 'summary'] })
      setModalOpen(false)
      resetForm()
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e.message }),
  })

  const deleteExpense = useMutation({
    mutationFn: expensesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['expenses', 'summary'] })
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e.message || 'Could not delete expense' }),
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('FOOD')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [dateValue, setDateValue] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Smart SMS State
  const [smsText, setSmsText] = useState('')
  const [showSmsInput, setShowSmsInput] = useState(false)
  const [clipboardBanner, setClipboardBanner] = useState<any>(null)
  const [detectedSmsList, setDetectedSmsList] = useState<any[]>([])

  // Request SMS permissions on startup & scan SMS history
  useEffect(() => {
    async function requestAndScanSms() {
      if (Platform.OS !== 'android') return;
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_SMS,
          {
            title: 'SMS Access Permission',
            message: 'LifeOS needs access to your SMS to automatically parse and track your bank transactions.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          // Scan past 24 hours of SMS messages
          const filter = {
            box: 'inbox',
            minDate: Date.now() - 24 * 60 * 60 * 1000, // last 24 hours
            maxCount: 20,
          };
          SmsAndroid.list(
            JSON.stringify(filter),
            (fail: string) => {
              console.log('Failed to scan SMS:', fail);
            },
            (count: number, smsList: string) => {
              const messages = JSON.parse(smsList);
              const transactions: any[] = [];
              messages.forEach((msg: any) => {
                const parsed = parseBankSms(msg.body);
                if (parsed) {
                  transactions.push({
                    id: msg._id || String(Math.random()),
                    ...parsed,
                    rawBody: msg.body,
                  });
                }
              });
              setDetectedSmsList(transactions);
            }
          );
        }
      } catch (err) {
        console.log('Permission error:', err);
      }
    }
    requestAndScanSms();
  }, []);

  // Check clipboard for transaction texts on mount/open
  useEffect(() => {
    async function checkClipboard() {
      try {
        const content = await Clipboard.getStringAsync()
        if (content) {
          const parsed = parseBankSms(content)
          if (parsed) {
            setClipboardBanner(parsed)
          }
        }
      } catch (err) {
        console.log('Clipboard error:', err)
      }
    }
    if (modalOpen) {
      checkClipboard()
    } else {
      setClipboardBanner(null)
    }
  }, [modalOpen])

  const handleApplyClipboard = () => {
    if (clipboardBanner) {
      setAmount(String(clipboardBanner.amount))
      setCategory(clipboardBanner.category)
      setTitle(clipboardBanner.merchant)
      setDate(clipboardBanner.transactionDate)
      setDateValue(new Date(clipboardBanner.transactionDate))
      setClipboardBanner(null)
      Toast.show({ type: 'success', text1: 'Auto-filled from copied text!' })
    }
  }

  const handleApplyDetectedSms = (smsItem: any) => {
    setAmount(String(smsItem.amount))
    setCategory(smsItem.category)
    setTitle(smsItem.merchant)
    setDate(smsItem.transactionDate)
    setDateValue(new Date(smsItem.transactionDate))
    setModalOpen(true)
    // Remove from the detected suggestions list once tapped
    setDetectedSmsList(prev => prev.filter(item => item.id !== smsItem.id))
    Toast.show({ type: 'success', text1: 'Auto-filled transaction from device SMS!' })
  }

  const handleParseManualSms = () => {
    const parsed = parseBankSms(smsText)
    if (parsed) {
      setAmount(String(parsed.amount))
      setCategory(parsed.category)
      setTitle(parsed.merchant)
      setDate(parsed.transactionDate)
      setDateValue(new Date(parsed.transactionDate))
      setSmsText('')
      setShowSmsInput(false)
      Toast.show({ type: 'success', text1: 'Auto-filled from SMS text!' })
    } else {
      Toast.show({ type: 'error', text1: 'Could not detect transaction in SMS' })
    }
  }

  const resetForm = () => {
    setTitle('')
    setAmount('')
    setCategory('FOOD')
    const today = new Date()
    setDateValue(today)
    setDate(today.toISOString().slice(0, 10))
    setSmsText('')
    setShowSmsInput(false)
    setClipboardBanner(null)
  }

  const handleCreate = () => {
    if (!amount) { Toast.show({ type: 'error', text1: 'Amount is required' }); return }

    const currentMonthStart = new Date()
    currentMonthStart.setDate(1)
    currentMonthStart.setHours(0, 0, 0, 0)
    const parts = date.split('-')
    const selectedDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))

    if (selectedDate < currentMonthStart) {
      Toast.show({
        type: 'error',
        text1: "This month's expenses are closed and locked. You can only manage expenses for the current calendar month."
      })
      return
    }

    createExpense.mutate({
      description: title.trim() || CATEGORY_LABELS[category] || category,
      amount: parseFloat(amount),
      category,
      transactionDate: date,
      type: 'EXPENSE',
    })
  }

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios')
    if (selectedDate) {
      setDateValue(selectedDate)
      setDate(selectedDate.toISOString().slice(0, 10))
    }
  }

  const handleDelete = (item: any) => {
    const currentMonthStart = new Date()
    currentMonthStart.setDate(1)
    currentMonthStart.setHours(0, 0, 0, 0)
    const transactionDateStr = item.transactionDate || item.date
    const parts = transactionDateStr.slice(0, 10).split('-')
    const selectedDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))

    if (selectedDate < currentMonthStart) {
      Toast.show({
        type: 'error',
        text1: "Locked month transactions cannot be deleted."
      })
      return
    }

    Alert.alert('Delete Transaction', 'Remove this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteExpense.mutate(item.id) },
    ])
  }

  const totalSpent = summary?.totalExpense ?? 0
  const totalIncome = summary?.totalIncome ?? 0

  const chartData = summary?.categoryDistribution
    ? Object.entries(summary.categoryDistribution)
        .map(([name, value]) => ({ name, value: Number(value) }))
        .filter(c => c.value > 0)
    : []

  const totalCatValues = chartData.reduce((s, c) => s + c.value, 0)

  let cumulativePercent = 0
  const formattedChartData = chartData.map((slice) => {
    const percent = totalCatValues > 0 ? (slice.value / totalCatValues) : 0
    const startAngle = cumulativePercent * 360
    cumulativePercent += percent
    const endAngle = cumulativePercent * 360
    return { ...slice, startAngle, endAngle, percent }
  })

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Expenses</Text>
          <Text style={styles.subtitle}>Where does the money go?</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setModalOpen(true) }}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {listLoading ? (
        <ActivityIndicator color={Colors.brand[500]} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: Spacing.lg }}
          ListHeaderComponent={
            <>
              {/* Total Banner */}
              <View style={styles.totalBanner}>
                <Text style={styles.totalLabel}>Total spent this month</Text>
                <Text style={styles.totalAmount}>₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</Text>
              </View>

              {/* Detected SMS logs section */}
              {detectedSmsList.length > 0 && (
                <View style={styles.detectedContainer}>
                  <Text style={styles.detectedSectionTitle}>✨ Transactions detected from SMS</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.detectedScroll}>
                    {detectedSmsList.map((item) => (
                      <TouchableOpacity key={item.id} style={[styles.detectedCard, Shadow.sm]} onPress={() => handleApplyDetectedSms(item)}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={styles.detectedCategoryLabel}>
                            {CATEGORY_LABELS[item.category] || item.category}
                          </Text>
                          <Text style={styles.detectedPrice}>₹{item.amount}</Text>
                        </View>
                        <Text numberOfLines={1} style={styles.detectedMerchant}>{item.merchant}</Text>
                        <Text style={styles.detectedCta}>Tap to log this expense</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Pie chart summary */}
              {chartData.length > 0 && (
                <View style={styles.breakdownCard}>
                  <Text style={styles.breakdownTitle}>Category Distribution</Text>
                  <View style={styles.chartContainer}>
                    <View style={styles.svgWrapper}>
                      <Svg width="120" height="120" viewBox="0 0 120 120">
                        <G transform="rotate(-90 60 60)">
                          {formattedChartData.map((slice, index) => {
                            const radius = 45
                            const strokeWidth = 14
                            const circumference = 2 * Math.PI * radius
                            const strokeDashoffset = circumference - (slice.percent * circumference)
                            const rotation = slice.startAngle

                            return (
                              <Circle
                                key={slice.name}
                                cx="60"
                                cy="60"
                                r={radius}
                                stroke={CATEGORY_COLORS[slice.name] || '#6B7280'}
                                strokeWidth={strokeWidth}
                                fill="transparent"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                transform={`rotate(${rotation} 60 60)`}
                              />
                            )
                          })}
                        </G>
                      </Svg>
                      <View style={styles.centerTextContainer}>
                        <Text style={styles.centerTextLabel}>Total</Text>
                        <Text style={styles.centerTextValue}>₹{totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                      </View>
                    </View>

                    {/* Legend */}
                    <View style={styles.legendContainer}>
                      {formattedChartData.slice(0, 4).map((slice) => (
                        <View key={slice.name} style={styles.legendItem}>
                          <View style={[styles.colorDot, { backgroundColor: CATEGORY_COLORS[slice.name] || '#6B7280' }]} />
                          <Text numberOfLines={1} style={styles.legendText}>
                            {CATEGORY_LABELS[slice.name] || slice.name}: {(slice.percent * 100).toFixed(0)}%
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              <Text style={styles.sectionTitle}>Transactions</Text>
            </>
          }
          renderItem={({ item }) => {
            const transactionDateStr = item.transactionDate || item.date
            const parts = transactionDateStr.slice(0, 10).split('-')
            const selectedDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
            const currentMonthStart = new Date()
            currentMonthStart.setDate(1)
            currentMonthStart.setHours(0, 0, 0, 0)
            const isLocked = selectedDate < currentMonthStart

            return (
              <View style={[styles.expenseCard, isLocked && { borderColor: Colors.surface.border, borderWidth: 1 }]}>
                <View style={styles.expenseLeft}>
                  <View style={[styles.expenseIcon, { backgroundColor: (CATEGORY_COLORS[item.category] || '#6B7280') + '20' }]}>
                    <Text style={{ fontSize: 16, color: CATEGORY_COLORS[item.category] || '#6B7280' }}>💸</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expenseTitle} numberOfLines={1}>{item.description || '—'}</Text>
                    <Text style={styles.expenseMeta}>{CATEGORY_LABELS[item.category] || item.category} • {transactionDateStr.slice(0, 10)}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', marginLeft: Spacing.sm }}>
                  <Text style={styles.expenseAmount}>₹{Number(item.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                  {!isLocked ? (
                    <TouchableOpacity onPress={() => handleDelete(item)}>
                      <Text style={{ fontSize: 13, color: Colors.status.error, marginTop: 4, fontWeight: '600' }}>Delete</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={{ fontSize: 10, color: Colors.ink[300], marginTop: 4, fontWeight: '600' }}>🔒 Locked</Text>
                  )}
                </View>
              </View>
            )
          }}
          ListEmptyComponent={<Text style={styles.empty}>No expenses yet. Start tracking your spending!</Text>}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Expense</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>

            {/* Smart Clipboard Notification Banner (Native only) */}
            {Platform.OS !== 'web' && clipboardBanner && (
              <TouchableOpacity style={styles.banner} onPress={handleApplyClipboard}>
                <Text style={styles.bannerEmoji}>✨</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bannerTitle}>Found transaction in clipboard!</Text>
                  <Text style={styles.bannerSubtitle}>
                    {clipboardBanner.merchant} · ₹{clipboardBanner.amount} · {CATEGORY_LABELS[clipboardBanner.category] || clipboardBanner.category}
                  </Text>
                </View>
                <Text style={styles.bannerCta}>Auto-Fill</Text>
              </TouchableOpacity>
            )}

            {/* Manual SMS Text Box (Native only) */}
            {Platform.OS !== 'web' && (
              <View style={styles.smsBox}>
                {!showSmsInput ? (
                  <TouchableOpacity onPress={() => setShowSmsInput(true)}>
                    <Text style={styles.smsCta}>✨ Auto-Fill from Bank SMS Text</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: '100%' }}>
                    <Text style={styles.smsLabel}>Paste Bank Transaction SMS</Text>
                    <TextInput
                      style={styles.smsInput}
                      multiline
                      numberOfLines={2}
                      placeholder="e.g. Your Account XX12 was debited by Rs. 550.00 at Swiggy..."
                      placeholderTextColor={Colors.ink[300]}
                      value={smsText}
                      onChangeText={setSmsText}
                    />
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                      <TouchableOpacity onPress={() => { setShowSmsInput(false); setSmsText('') }} style={styles.smsBtnGhost}>
                        <Text style={styles.smsBtnTextGhost}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleParseManualSms} style={styles.smsBtn}>
                        <Text style={styles.smsBtnText}>Auto-Fill</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            <Text style={styles.label}>Amount (₹) *</Text>
            <TextInput style={styles.input} placeholder="0.00" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />

            <Text style={styles.label}>Date</Text>
            {Platform.OS === 'web' ? (
              <View style={{ position: 'relative', width: '100%' }}>
                <style>{`
                  .custom-date-input::-webkit-calendar-picker-indicator {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                    cursor: pointer;
                  }
                `}</style>
                <input
                  type="date"
                  className="custom-date-input"
                  value={date}
                  onChange={(e) => {
                    const val = e.target.value
                    setDate(val)
                    const parts = val.split('-')
                    if (parts.length === 3) {
                      setDateValue(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])))
                    }
                  }}
                  style={{
                    borderWidth: 1.5,
                    borderStyle: 'solid',
                    borderColor: Colors.ink[200],
                    borderRadius: BorderRadius.md,
                    paddingLeft: Spacing.md,
                    paddingRight: 40,
                    paddingTop: 12,
                    paddingBottom: 12,
                    fontSize: FontSize.md,
                    color: Colors.ink[900],
                    backgroundColor: Colors.surface.white,
                    marginBottom: Spacing.sm,
                    width: '100%',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
                <Text style={{
                  position: 'absolute',
                  right: Spacing.md,
                  top: 14,
                  fontSize: 16,
                  pointerEvents: 'none',
                }}>
                  📅
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity style={styles.dateSelectorButton} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.dateSelectorText}>📅 {date}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={dateValue}
                    mode="date"
                    display="default"
                    onChange={onChangeDate}
                  />
                )}
              </>
            )}

            <Text style={styles.label}>Category</Text>
            <View style={styles.row}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{CATEGORY_LABELS[c] || c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput style={styles.input} placeholder="e.g., Lunch at cafe" value={title} onChangeText={setTitle} />

            <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={createExpense.isPending}>
              {createExpense.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Add Expense</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface.soft },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, paddingBottom: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.ink[900] },
  subtitle: { fontSize: FontSize.sm, color: Colors.ink[500] },
  addBtn: { backgroundColor: Colors.brand[500], borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  totalBanner: { backgroundColor: Colors.brand[500], borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  totalLabel: { color: Colors.brand[100], fontSize: FontSize.sm, fontWeight: '600' },
  totalAmount: { color: '#fff', fontSize: FontSize.xxxl, fontWeight: '800', marginTop: 4 },
  breakdownCard: { backgroundColor: Colors.surface.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.sm },
  breakdownTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.ink[900], marginBottom: Spacing.sm },
  chartContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xs },
  svgWrapper: { position: 'relative', width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  centerTextContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  centerTextLabel: { fontSize: 9, color: Colors.ink[400], textTransform: 'uppercase', fontWeight: '700' },
  centerTextValue: { fontSize: FontSize.sm, color: Colors.ink[900], fontWeight: '800', marginTop: 1 },
  legendContainer: { flex: 1, gap: 8, paddingLeft: Spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  colorDot: { width: 8, height: 8, borderRadius: BorderRadius.full },
  legendText: { fontSize: FontSize.xs, color: Colors.ink[700], fontWeight: '600', flexShrink: 1 },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.ink[900], marginBottom: Spacing.sm, marginTop: Spacing.xs },
  expenseCard: { backgroundColor: Colors.surface.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...Shadow.sm },
  expenseLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  expenseIcon: { width: 40, height: 40, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  expenseTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.ink[900] },
  expenseMeta: { fontSize: FontSize.xs, color: Colors.ink[500], marginTop: 2 },
  expenseAmount: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.ink[900] },
  empty: { textAlign: 'center', color: Colors.ink[400], marginTop: 60, fontSize: FontSize.sm },
  
  // Modal layout
  modal: { padding: Spacing.xl, backgroundColor: Colors.surface.soft },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.ink[900] },
  modalClose: { fontSize: 20, color: Colors.ink[500] },
  
  // SMS helper styling
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderWidth: 1.5, borderColor: '#C7D2FE', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm },
  bannerEmoji: { fontSize: 20 },
  bannerTitle: { fontSize: FontSize.sm, fontWeight: '700', color: '#3730A3' },
  bannerSubtitle: { fontSize: FontSize.xs, color: '#4F46E5', marginTop: 2 },
  bannerCta: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.brand[500] },

  smsBox: { backgroundColor: '#F8FAFC', borderWidth: 1, borderStyle: 'solid', borderColor: '#E2E8F0', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, alignItems: 'center' },
  smsCta: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.brand[500] },
  smsLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.ink[500], textTransform: 'uppercase', marginBottom: 6 },
  smsInput: { width: '100%', minHeight: 60, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: BorderRadius.md, backgroundColor: '#fff', padding: Spacing.sm, fontSize: FontSize.sm, color: Colors.ink[900], marginBottom: Spacing.sm },
  smsBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  smsBtnGhost: { paddingVertical: 6, paddingHorizontal: 12 },
  smsBtnTextGhost: { color: Colors.ink[500], fontSize: FontSize.xs, fontWeight: '600' },
  smsBtn: { backgroundColor: Colors.brand[500], paddingVertical: 6, paddingHorizontal: 12, borderRadius: BorderRadius.sm },
  smsBtnText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },

  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.ink[700], marginBottom: 6, marginTop: Spacing.sm },
  input: { borderWidth: 1.5, borderColor: Colors.ink[200], borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 12, fontSize: FontSize.md, color: Colors.ink[900], backgroundColor: Colors.surface.white, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', marginBottom: Spacing.sm },
  chip: { borderWidth: 1.5, borderColor: Colors.ink[200], borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  chipActive: { backgroundColor: Colors.brand[500], borderColor: Colors.brand[500] },
  chipText: { fontSize: FontSize.sm, color: Colors.ink[700], fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: Colors.brand[500], borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.xl },
  submitText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  dateSelectorButton: { borderWidth: 1.5, borderColor: Colors.ink[200], borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 12, backgroundColor: Colors.surface.white, marginBottom: Spacing.sm },
  dateSelectorText: { fontSize: FontSize.md, color: Colors.ink[900], fontWeight: '500' },

  // Detected SMS suggestions list styling
  detectedContainer: { marginBottom: Spacing.md },
  detectedSectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.brand[600], marginBottom: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  detectedScroll: { gap: Spacing.sm, paddingRight: Spacing.lg },
  detectedCard: { backgroundColor: Colors.surface.white, borderRadius: BorderRadius.lg, padding: Spacing.md, width: 220, borderWidth: 1, borderColor: Colors.brand[100] },
  detectedCategoryLabel: { fontSize: 11, fontWeight: '700', color: Colors.ink[400], textTransform: 'uppercase' },
  detectedPrice: { fontSize: FontSize.md, fontWeight: '800', color: Colors.ink[900] },
  detectedMerchant: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.ink[900], marginBottom: 4 },
  detectedCta: { fontSize: 10, fontWeight: '700', color: Colors.brand[500], textTransform: 'uppercase' },
})
