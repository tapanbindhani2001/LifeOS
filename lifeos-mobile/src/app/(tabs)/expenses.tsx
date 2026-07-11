import React, { useState, useEffect, useMemo } from 'react'
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Alert, Platform,
  KeyboardAvoidingView, ScrollView, Dimensions, Share
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as Clipboard from 'expo-clipboard'
import * as ImagePicker from 'expo-image-picker'
import { expensesApi, budgetApi } from '../../api/features'
import { Spacing, BorderRadius, FontSize, Shadow } from '../../constants/theme'
import { useTheme, makeStyles } from '../../context/ThemeContext'
import Toast from 'react-native-toast-message'
import { parseBankSms } from '../../utils/smsParser'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { importTransactionsFromSMS } from '../../utils/smsAutoReader'

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = ['FOOD', 'RENT', 'TRANSPORT', 'SHOPPING', 'BILLS', 'ENTERTAINMENT', 'HEALTH', 'OTHER']
const INCOME_CATEGORIES = ['SALARY', 'FREELANCE', 'INVESTMENT', 'GIFT', 'OTHER']

const CATEGORY_LABELS: Record<string, string> = {
  FOOD: 'Food', RENT: 'Rent', TRANSPORT: 'Transport',
  SHOPPING: 'Shopping', BILLS: 'Bills', ENTERTAINMENT: 'Entertainment',
  HEALTH: 'Health', OTHER: 'Other',
  SALARY: 'Salary', FREELANCE: 'Freelance', INVESTMENT: 'Investment', GIFT: 'Gift',
}

const CATEGORY_ICONS: Record<string, string> = {
  FOOD: '🍔', RENT: '🏠', TRANSPORT: '🚗', SHOPPING: '🛍️',
  BILLS: '⚡', ENTERTAINMENT: '🎬', HEALTH: '❤️\u200d🩹', OTHER: '💳',
  SALARY: '💰', FREELANCE: '💻', INVESTMENT: '📈', GIFT: '🎁',
}

const CATEGORY_COLORS: Record<string, string> = {
  FOOD: '#10B981', RENT: '#3B82F6', TRANSPORT: '#F59E0B',
  SHOPPING: '#EC4899', BILLS: '#EF4444', ENTERTAINMENT: '#8B5CF6',
  HEALTH: '#06B6D4', OTHER: '#6B7280',
  SALARY: '#10B981', FREELANCE: '#3B82F6', INVESTMENT: '#8B5CF6', GIFT: '#EC4899',
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function parseLocalDate(str: string): Date {
  const parts = str.slice(0, 10).split('-')
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
}

function monthLabel(key: string): string {
  const parts = key.split('-')
  return MONTHS_SHORT[parseInt(parts[1]) - 1] + " '" + parts[0].slice(2)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExpensesScreen() {
  const qc = useQueryClient()
  const { colors } = useTheme()
  const styles = useStyles()
  const SCREEN_W = Dimensions.get('window').width

  // Month selector
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })

  const monthStart = useMemo(() =>
    toDateStr(new Date(selectedMonth.year, selectedMonth.month - 1, 1)), [selectedMonth])
  const monthEnd = useMemo(() =>
    toDateStr(new Date(selectedMonth.year, selectedMonth.month, 0)), [selectedMonth])

  const monthTabs = useMemo(() => {
    const tabs = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      tabs.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
    }
    return tabs
  }, [])

  // Queries
  const { data: allExpenses = [], isLoading: listLoading } = useQuery({
    queryKey: ['expenses'], queryFn: expensesApi.list,
  })
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['expenses', 'summary', monthStart, monthEnd],
    queryFn: () => expensesApi.summary(monthStart, monthEnd),
  })
  const { data: monthlyStats = [] } = useQuery({
    queryKey: ['expenses', 'monthly-stats'],
    queryFn: () => expensesApi.monthlySummary(6),
  })
  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: budgetApi.list,
  })

  const expenses = useMemo(() => {
    const key = `${String(selectedMonth.year)}-${String(selectedMonth.month).padStart(2, '0')}`
    return (allExpenses as any[]).filter(item => (item.transactionDate || '').slice(0, 7) === key)
  }, [allExpenses, selectedMonth])

  // Mutations
  const createExpense = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: (response: any) => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      closeModal()
      const tx = response?.data ?? response
      if (tx?.budgetAlert) {
        // Trigger local notification for testing inside Expo Go
        try {
          if (Platform.OS !== 'web') {
            const Notifications = require('expo-notifications')
            Notifications.scheduleNotificationAsync({
              content: {
                title: '⚠️ Budget Alert',
                body: tx.budgetAlert,
                sound: 'default',
              },
              trigger: null,
            }).catch(() => {})
          }
        } catch (_) {}
        
        Toast.show({
          type: 'error',
          text1: 'Budget Warning',
          text2: tx.budgetAlert,
          visibilityTime: 7000,
        })
      } else {
        Toast.show({ type: 'success', text1: '✅ Transaction added!' })
      }
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e.message || 'Could not add transaction' }),
  })
  const updateExpense = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => expensesApi.update(id, data),
    onSuccess: (response: any) => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      closeModal()
      const tx = response?.data ?? response
      if (tx?.budgetAlert) {
        // Trigger local notification
        try {
          if (Platform.OS !== 'web') {
            const Notifications = require('expo-notifications')
            Notifications.scheduleNotificationAsync({
              content: {
                title: '⚠️ Budget Alert',
                body: tx.budgetAlert,
                sound: 'default',
              },
              trigger: null,
            }).catch(() => {})
          }
        } catch (_) {}

        Toast.show({
          type: 'error',
          text1: 'Budget Warning',
          text2: tx.budgetAlert,
          visibilityTime: 7000,
        })
      } else {
        Toast.show({ type: 'success', text1: '✅ Transaction updated!' })
      }
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e.message || 'Could not update transaction' }),
  })
  const deleteExpense = useMutation({
    mutationFn: expensesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
    onError: (e: any) => Toast.show({ type: 'error', text1: e.message || 'Could not delete transaction' }),
  })

  // Form State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expenseType, setExpenseType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('FOOD')
  const [date, setDate] = useState(toDateStr(new Date()))
  const [dateValue, setDateValue] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [smsStatus, setSmsStatus] = useState<string | null>(null)
  const [detailItem, setDetailItem] = useState<any | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Auto-sync SMS once on mount — 6-hour cooldown prevents repeat scans
  useEffect(() => {
    if (Platform.OS !== 'android') return

    let isMounted = true
    async function autoSync() {
      setSmsStatus('📱 Syncing bank SMS...')
      try {
        const result = await importTransactionsFromSMS()
        if (!isMounted) return
        if (result.skippedCooldown) {
          setSmsStatus(null)
          return
        }
        if (result.imported > 0) {
          qc.invalidateQueries({ queryKey: ['expenses'] })
          Toast.show({
            type: 'success',
            text1: `✨ Auto-tracked ${result.imported} bank transaction${result.imported > 1 ? 's' : ''} from SMS`,
            position: 'top',
            visibilityTime: 4000,
          })
        }
      } catch (e) {
        console.log('[SMS] Auto sync skipped:', e)
      } finally {
        if (isMounted) setSmsStatus(null)
      }
    }

    // Slight delay to avoid blocking first render
    const timer = setTimeout(autoSync, 1500)
    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, []) // ← empty deps: run once on mount only
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [smsText, setSmsText] = useState('')
  const [showSmsInput, setShowSmsInput] = useState(false)
  const [clipboardBanner, setClipboardBanner] = useState<any>(null)

  // Derived
  const totalIncome = Number(summary?.totalIncome ?? 0)
  const totalExpense = Number(summary?.totalExpense ?? 0)
  const netBalance = Number(summary?.netBalance ?? 0)

  const categoryBreakdown: { category: string; amount: number }[] = useMemo(() =>
    ((summary?.categoryBreakdown as any[]) ?? []).map(c => ({ category: c.category, amount: Number(c.amount) })),
    [summary])
  const totalCatAmount = categoryBreakdown.reduce((s, c) => s + c.amount, 0)

  const filteredExpenses = useMemo(() => {
    let list = expenses as any[]
    if (filterCategory) list = list.filter(e => e.category === filterCategory)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(e => (e.description || '').toLowerCase().includes(q) || (e.category || '').toLowerCase().includes(q))
    }
    return list
  }, [expenses, filterCategory, searchQuery])

  const trendData = (monthlyStats as any[]).map(s => ({
    month: monthLabel(s.month), income: Number(s.income ?? 0), expense: Number(s.expense ?? 0),
  }))
  const trendMax = Math.max(...trendData.flatMap(d => [d.income, d.expense]), 1)
  const CHART_H = 100
  const CHART_W = SCREEN_W - Spacing.lg * 4 - 8
  const BAR_W = Math.max(8, Math.floor(CHART_W / (trendData.length * 3)) - 1)

  // Budget map: category -> monthlyLimit
  const budgetMap = useMemo(() => {
    const map: Record<string, number> = {}
    ;(budgets as any[]).forEach(b => { map[b.category] = Number(b.monthlyLimit) })
    return map
  }, [budgets])

  // Smart insights: auto-generated observations
  const insights = useMemo(() => {
    const msgs: { type: 'warning' | 'danger' | 'success'; text: string }[] = []
    // Budget alerts
    categoryBreakdown.forEach(c => {
      const limit = budgetMap[c.category]
      if (!limit) return
      const ratio = c.amount / limit
      if (ratio > 1) msgs.push({ type: 'danger', text: `${CATEGORY_ICONS[c.category] || ''} ${CATEGORY_LABELS[c.category]} is ₹${Math.round(c.amount - limit).toLocaleString('en-IN')} over budget` })
      else if (ratio > 0.8) msgs.push({ type: 'warning', text: `${CATEGORY_ICONS[c.category] || ''} ${CATEGORY_LABELS[c.category]} at ${Math.round(ratio * 100)}% of budget` })
    })
    // Net balance
    if (netBalance > 0) msgs.push({ type: 'success', text: `✅ On track to save ₹${netBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })} this month` })
    else if (netBalance < 0) msgs.push({ type: 'danger', text: `⚠️ Spending ₹${Math.abs(netBalance).toLocaleString('en-IN', { maximumFractionDigits: 0 })} more than income this month` })
    // Month-over-month trend
    if (trendData.length >= 2) {
      const last = trendData[trendData.length - 1]
      const prev = trendData[trendData.length - 2]
      if (prev.expense > 0 && last.expense > 0) {
        const diff = Math.round(((last.expense - prev.expense) / prev.expense) * 100)
        if (diff > 20) msgs.push({ type: 'warning', text: `📈 Spending is ${diff}% higher than last month` })
        else if (diff < -20) msgs.push({ type: 'success', text: `📉 Spending is ${Math.abs(diff)}% lower than last month` })
      }
    }
    return msgs.slice(0, 4) // max 4 insights
  }, [categoryBreakdown, budgetMap, netBalance, trendData])

  // Recurring templates
  const [recurringTemplates, setRecurringTemplates] = React.useState<any[]>([])
  const [isRecurring, setIsRecurring] = React.useState(false)

  useEffect(() => {
    AsyncStorage.getItem('expense_recurring_templates').then(val => {
      if (val) setRecurringTemplates(JSON.parse(val))
    }).catch(() => {})
  }, [])

  const saveRecurringTemplate = async (payload: any) => {
    const updated = [...recurringTemplates.filter(t => t.category !== payload.category || t.type !== payload.type), { ...payload, id: Date.now().toString() }]
    setRecurringTemplates(updated)
    await AsyncStorage.setItem('expense_recurring_templates', JSON.stringify(updated))
  }

  const deleteRecurringTemplate = async (id: string) => {
    const updated = recurringTemplates.filter(t => t.id !== id)
    setRecurringTemplates(updated)
    await AsyncStorage.setItem('expense_recurring_templates', JSON.stringify(updated))
  }

  const applyTemplate = (t: any) => {
    setExpenseType(t.type || 'EXPENSE')
    setTitle(t.description || '')
    setAmount(String(t.amount || ''))
    setCategory(t.category || 'FOOD')
    setDate(toDateStr(new Date()))
    setDateValue(new Date())
    setModalOpen(true)
  }

  // Export CSV
  const handleExportCSV = async () => {
    const header = 'Date,Type,Category,Description,Amount\n'
    const rows = (expenses as any[]).map(e => {
      const desc = (e.description || '').replace(/,/g, ';')
      return `${e.transactionDate || ''},${e.type || ''},${e.category || ''},${desc},${e.amount || ''}`
    }).join('\n')
    const csv = header + rows
    try {
      await Share.share({ message: csv, title: `Expenses ${MONTHS_SHORT[selectedMonth.month - 1]} ${selectedMonth.year}` })
    } catch (_) {}
  }

  // Clipboard check
  useEffect(() => {
    if (!modalOpen) { setClipboardBanner(null); return }
    Clipboard.getStringAsync().then(content => {
      if (content) { const parsed = parseBankSms(content); if (parsed) setClipboardBanner(parsed) }
    }).catch(() => {})
  }, [modalOpen])

  // Handlers
  const resetForm = () => {
    setEditingId(null); setExpenseType('EXPENSE'); setTitle(''); setAmount('')
    setCategory('FOOD'); const today = new Date(); setDateValue(today); setDate(toDateStr(today))
    setSmsText(''); setShowSmsInput(false); setClipboardBanner(null); setIsRecurring(false)
  }
  const openAddModal = () => { resetForm(); setModalOpen(true) }
  const openDetailSheet = (item: any) => { setDetailItem(item); setDetailOpen(true) }
  const closeDetailSheet = () => { setDetailOpen(false); setDetailItem(null) }
  const openEditModal = (item: any) => {
    setEditingId(item.id); setExpenseType(item.type || 'EXPENSE'); setTitle(item.description || '')
    setAmount(String(item.amount)); setCategory(item.category || 'OTHER')
    const d = parseLocalDate(item.transactionDate || toDateStr(new Date())); setDateValue(d); setDate(toDateStr(d))
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); resetForm() }

  const handleSubmit = () => {
    const numAmount = parseFloat(amount)
    if (!amount || isNaN(numAmount) || numAmount <= 0) { Toast.show({ type: 'error', text1: 'Please enter a valid amount' }); return }
    const payload = { description: title.trim() || CATEGORY_LABELS[category] || category, amount: numAmount, category, transactionDate: date, type: expenseType }
    if (editingId) { updateExpense.mutate({ id: editingId, data: payload }) } else {
      createExpense.mutate(payload)
      if (isRecurring) saveRecurringTemplate(payload)
    }
  }

  const handleDelete = (item: any) => {
    const lockCutoff = new Date(); lockCutoff.setDate(lockCutoff.getDate() - 60)
    const txDate = parseLocalDate(item.transactionDate || toDateStr(new Date()))
    if (txDate < lockCutoff) { Toast.show({ type: 'error', text1: '🔒 Transaction locked (older than 60 days)' }); return }
    Alert.alert('Delete Transaction', 'Remove this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteExpense.mutate(item.id) },
    ])
  }

  const onChangeDate = (event: any, selected?: Date) => {
    setShowDatePicker(Platform.OS === 'ios')
    if (selected) { setDateValue(selected); setDate(toDateStr(selected)) }
  }

  const handleApplyClipboard = () => {
    if (!clipboardBanner) return
    setAmount(String(clipboardBanner.amount)); setCategory(clipboardBanner.category)
    setTitle(clipboardBanner.merchant || '')
    const d = clipboardBanner.transactionDate || toDateStr(new Date()); setDate(d); setDateValue(new Date(d))
    setClipboardBanner(null); Toast.show({ type: 'success', text1: 'Auto-filled from clipboard!' })
  }

  const handleParseManualSms = () => {
    const parsed = parseBankSms(smsText)
    if (parsed) {
      setAmount(String(parsed.amount)); setCategory(parsed.category); setTitle(parsed.merchant || '')
      const d = parsed.transactionDate || toDateStr(new Date()); setDate(d); setDateValue(new Date(d))
      setSmsText(''); setShowSmsInput(false); Toast.show({ type: 'success', text1: 'Auto-filled from SMS!' })
    } else { Toast.show({ type: 'error', text1: 'Could not detect transaction in SMS' }) }
  }

  const processScannedReceipt = async (uri: string) => {
    setScanning(true)
    try {
      const filename = uri.split('/').pop() || 'receipt.jpg'
      const match = /\.(\w+)$/.exec(filename)
      const type = match ? `image/${match[1]}` : 'image/jpeg'
      const response = await expensesApi.scanReceipt(uri, filename, type)
      const scanned = response?.data ?? response
      if (scanned) {
        setTitle(scanned.merchant || ''); setAmount(String(scanned.amount || ''))
        setCategory(scanned.category || 'OTHER')
        if (scanned.date) { setDate(scanned.date); setDateValue(new Date(scanned.date)) }
        Toast.show({ type: 'success', text1: '✨ Receipt scanned!', text2: `${scanned.merchant} · ₹${scanned.amount}` })
      }
    } catch (err: any) { Toast.show({ type: 'error', text1: 'Receipt scan failed', text2: err.message })
    } finally { setScanning(false) }
  }

  const handleScanCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') { Toast.show({ type: 'error', text1: 'Camera permission denied' }); return }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [4, 3] })
    if (!result.canceled && result.assets[0]) processScannedReceipt(result.assets[0].uri)
  }

  const handleScanLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true })
    if (!result.canceled && result.assets[0]) processScannedReceipt(result.assets[0].uri)
  }

  const activeCategories = expenseType === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const isPending = createExpense.isPending || updateExpense.isPending

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Expenses</Text>
          <Text style={styles.subtitle}>Track every rupee</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }}>
          <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {smsStatus && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.lg, paddingBottom: 6 }}>
          <ActivityIndicator size="small" color={colors.brand[500]} />
          <Text style={{ fontSize: 12, color: colors.ink[500], fontWeight: '600' }}>{smsStatus}</Text>
        </View>
      )}


      {(listLoading || summaryLoading) ? (
        <ActivityIndicator color={colors.brand[500]} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={filteredExpenses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthTabs}>
                {monthTabs.map(tab => {
                  const isActive = tab.year === selectedMonth.year && tab.month === selectedMonth.month
                  const label = MONTHS_SHORT[tab.month - 1] + " '" + String(tab.year).slice(2)
                  return (
                    <TouchableOpacity key={`${tab.year}-${tab.month}`} style={[styles.monthTab, isActive && styles.monthTabActive]} onPress={() => setSelectedMonth(tab)}>
                      <Text style={[styles.monthTabText, isActive && styles.monthTabTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>

              <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { backgroundColor: '#10B981' }]}>
                  <Text style={styles.summaryCardLabel}>Income</Text>
                  <Text style={styles.summaryCardValue}>₹{totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: '#EF4444' }]}>
                  <Text style={styles.summaryCardLabel}>Spent</Text>
                  <Text style={styles.summaryCardValue}>₹{totalExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: netBalance >= 0 ? '#3B82F6' : '#F59E0B' }]}>
                  <Text style={styles.summaryCardLabel}>Net</Text>
                  <Text style={styles.summaryCardValue}>{netBalance < 0 ? '-' : ''}₹{Math.abs(netBalance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                </View>
              </View>

              {categoryBreakdown.length > 0 && (
                <View style={styles.sectionCard}>
                  <Text style={styles.cardTitle}>Category Breakdown</Text>
                  {categoryBreakdown.map(c => {
                    const budget = budgetMap[c.category]
                    const pct = budget ? Math.min(c.amount / budget, 1) : (totalCatAmount > 0 ? c.amount / totalCatAmount : 0)
                    const color = budget
                      ? (c.amount > budget ? '#EF4444' : c.amount / budget > 0.8 ? '#F59E0B' : '#10B981')
                      : (CATEGORY_COLORS[c.category] || '#6B7280')
                    return (
                      <View key={c.category}>
                        <View style={styles.catRow}>
                          <View style={styles.catLeft}>
                            <Text style={styles.catIcon}>{CATEGORY_ICONS[c.category] || '💳'}</Text>
                            <Text style={styles.catLabel} numberOfLines={1}>{CATEGORY_LABELS[c.category] || c.category}</Text>
                          </View>
                          <View style={styles.catBarWrap}>
                            <View style={[styles.catBar, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: color }]} />
                          </View>
                          <Text style={styles.catAmount}>₹{c.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                        </View>
                        {budget ? (
                          <Text style={[styles.budgetSubtext, { color }]}>
                            {c.amount > budget
                              ? `Over by ₹${Math.round(c.amount - budget).toLocaleString('en-IN')}`
                              : `₹${Math.round(budget - c.amount).toLocaleString('en-IN')} remaining of ₹${budget.toLocaleString('en-IN')} budget`}
                          </Text>
                        ) : null}
                      </View>
                    )
                  })}
                </View>
              )}

              {trendData.length > 0 && (
                <View style={styles.sectionCard}>
                  <Text style={styles.cardTitle}>6-Month Trend</Text>
                  <View style={{ marginTop: Spacing.sm, overflow: 'hidden' }}>
                    <Svg width={CHART_W} height={CHART_H + 40}>
                      {trendData.map((d, i) => {
                        const slotW = CHART_W / trendData.length
                        const x = i * slotW
                        const incomeH = trendMax > 0 ? (d.income / trendMax) * CHART_H : 0
                        const expenseH = trendMax > 0 ? (d.expense / trendMax) * CHART_H : 0
                        const expLabelY = CHART_H - expenseH - 4
                        return (
                          <G key={d.month} x={x + (slotW - BAR_W * 2 - 2) / 2}>
                            <Rect x={0} y={CHART_H - incomeH} width={BAR_W} height={Math.max(incomeH, 2)} fill="#10B981" rx={3} />
                            <Rect x={BAR_W + 2} y={CHART_H - expenseH} width={BAR_W} height={Math.max(expenseH, 2)} fill="#EF4444" rx={3} />
                            {d.expense > 0 && (
                              <SvgText
                                x={BAR_W + 1}
                                y={Math.max(expLabelY, 8)}
                                fontSize={7}
                                fill="#EF4444"
                                textAnchor="middle"
                                fontWeight="700"
                              >
                                {d.expense >= 1000 ? `${Math.round(d.expense / 1000)}k` : String(Math.round(d.expense))}
                              </SvgText>
                            )}
                            <SvgText x={BAR_W} y={CHART_H + 16} fontSize={8} fill="#9CA3AF" textAnchor="middle">{d.month}</SvgText>
                          </G>
                        )
                      })}
                    </Svg>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#10B981' }} />
                      <Text style={styles.legendText}>Income</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#EF4444' }} />
                      <Text style={styles.legendText}>Expense</Text>
                    </View>
                  </View>
                  {/* Monthly summary strip */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.sm }}>
                    {trendData.map(d => (
                      <View key={d.month} style={styles.trendMonthChip}>
                        <Text style={styles.trendMonthLabel}>{d.month}</Text>
                        <Text style={styles.trendMonthExpense}>-₹{d.expense >= 1000 ? `${(d.expense / 1000).toFixed(1)}k` : d.expense.toFixed(0)}</Text>
                        {d.income > 0 && <Text style={styles.trendMonthIncome}>+₹{d.income >= 1000 ? `${(d.income / 1000).toFixed(1)}k` : d.income.toFixed(0)}</Text>}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Smart Insights */}
              {insights.length > 0 && (
                <View style={styles.sectionCard}>
                  <Text style={styles.cardTitle}>💡 Smart Insights</Text>
                  {insights.map((ins, i) => (
                    <View key={i} style={[styles.insightRow, ins.type === 'danger' ? styles.insightDanger : ins.type === 'warning' ? styles.insightWarning : styles.insightSuccess]}>
                      <Text style={styles.insightText}>{ins.text}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Recurring Templates */}
              {recurringTemplates.length > 0 && (
                <View style={styles.sectionCard}>
                  <Text style={styles.cardTitle}>🔁 Quick Log</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
                    {recurringTemplates.map(t => (
                      <TouchableOpacity key={t.id} style={styles.recurringCard} onPress={() => applyTemplate(t)}>
                        <Text style={styles.recurringIcon}>{CATEGORY_ICONS[t.category] || '💳'}</Text>
                        <Text style={styles.recurringTitle} numberOfLines={1}>{t.description || CATEGORY_LABELS[t.category]}</Text>
                        <Text style={styles.recurringAmount}>₹{Number(t.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                        <TouchableOpacity onPress={() => deleteRecurringTemplate(t.id)} style={styles.recurringDel}>
                          <Text style={{ fontSize: 9, color: '#EF4444', fontWeight: '800' }}>✕</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Search + Export */}
              <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', marginBottom: Spacing.sm }}>
                <TextInput
                  style={[styles.searchInput, { flex: 1, marginBottom: 0 }]}
                  placeholder="🔍  Search transactions..."
                  placeholderTextColor={colors.ink[400]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
                  <Text style={styles.exportBtnText}>📤</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
                <TouchableOpacity style={[styles.filterChip, !filterCategory && styles.filterChipActive]} onPress={() => setFilterCategory(null)}>
                  <Text style={[styles.filterChipText, !filterCategory && styles.filterChipTextActive]}>All</Text>
                </TouchableOpacity>
                {EXPENSE_CATEGORIES.map(c => (
                  <TouchableOpacity key={c} style={[styles.filterChip, filterCategory === c && styles.filterChipActive]} onPress={() => setFilterCategory(filterCategory === c ? null : c)}>
                    <Text style={[styles.filterChipText, filterCategory === c && styles.filterChipTextActive]}>{CATEGORY_ICONS[c]} {CATEGORY_LABELS[c]}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.sectionTitle}>Transactions ({filteredExpenses.length})</Text>
            </>
          }
          renderItem={({ item }) => {
            const lockCutoff = new Date(); lockCutoff.setDate(lockCutoff.getDate() - 60)
            const txDate = parseLocalDate(item.transactionDate || toDateStr(new Date()))
            const isLocked = txDate < lockCutoff
            const isIncome = item.type === 'INCOME'
            const color = isIncome ? '#10B981' : (CATEGORY_COLORS[item.category] || '#6B7280')
            const isAutoSms = !!(item.smsExternalId)
            return (
              <TouchableOpacity style={[styles.expenseCard, isLocked && styles.expenseCardLocked]} onPress={() => openDetailSheet(item)} activeOpacity={0.75}>
                <View style={[styles.expenseIcon, { backgroundColor: color + '20' }]}>
                  <Text style={{ fontSize: 20 }}>{CATEGORY_ICONS[item.category] || '💳'}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.expenseTitle} numberOfLines={1}>{item.description || CATEGORY_LABELS[item.category] || '—'}</Text>
                    {isAutoSms && <View style={styles.smsBadge}><Text style={styles.smsBadgeText}>📱</Text></View>}
                    {isLocked && <View style={styles.lockBadge}><Text style={styles.lockBadgeText}>🔒</Text></View>}
                  </View>
                  <Text style={styles.expenseMeta}>{CATEGORY_LABELS[item.category] || item.category} • {(item.transactionDate || '').slice(0, 10)}</Text>
                </View>
                <Text style={[styles.expenseAmount, { color }]}>{isIncome ? '+' : '-'}₹{Number(item.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🧾</Text>
              <Text style={styles.emptyText}>No transactions this month</Text>
              <Text style={styles.emptySubText}>Tap "+ Add" to log your first entry or wait for SMS sync</Text>
            </View>
          }
        />
      )}

      {/* ── Transaction Detail Sheet ──────────────────────────────────────── */}
      <Modal visible={detailOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeDetailSheet}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.soft }}>
          {detailItem && (() => {
            const item = detailItem
            const lockCutoff = new Date(); lockCutoff.setDate(lockCutoff.getDate() - 60)
            const txDate = parseLocalDate(item.transactionDate || toDateStr(new Date()))
            const isLocked = txDate < lockCutoff
            const isIncome = item.type === 'INCOME'
            const color = isIncome ? '#10B981' : (CATEGORY_COLORS[item.category] || '#6B7280')
            const isAutoSms = !!(item.smsExternalId)
            const formattedDate = (() => {
              try {
                const d = parseLocalDate(item.transactionDate)
                return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
              } catch { return item.transactionDate }
            })()
            return (
              <ScrollView contentContainerStyle={{ padding: Spacing.xl }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl }}>
                  <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.ink[900] }}>Transaction Detail</Text>
                  <TouchableOpacity onPress={closeDetailSheet}>
                    <Text style={{ fontSize: 22, color: colors.ink[400] }}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Amount hero */}
                <View style={[styles.detailAmountCard, { borderColor: color + '40', backgroundColor: color + '0D' }]}>
                  <Text style={{ fontSize: 48, marginBottom: 6 }}>{CATEGORY_ICONS[item.category] || '💳'}</Text>
                  <Text style={[styles.detailAmount, { color }]}>
                    {isIncome ? '+' : '-'}₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <View style={[styles.detailCategoryBadge, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.detailCategoryText, { color }]}>{CATEGORY_ICONS[item.category]} {CATEGORY_LABELS[item.category] || item.category}</Text>
                  </View>
                </View>

                {/* Details rows */}
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Description</Text>
                    <Text style={styles.detailRowValue}>{item.description || '—'}</Text>
                  </View>
                  <View style={styles.detailDivider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Date</Text>
                    <Text style={styles.detailRowValue}>{formattedDate}</Text>
                  </View>
                  <View style={styles.detailDivider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Type</Text>
                    <Text style={styles.detailRowValue}>{isIncome ? '📥 Income' : '📤 Expense'}</Text>
                  </View>
                  <View style={styles.detailDivider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Source</Text>
                    <View style={[styles.sourceBadge, isAutoSms ? styles.sourceBadgeSms : styles.sourceBadgeManual]}>
                      <Text style={[styles.sourceBadgeText, isAutoSms ? { color: '#0369a1' } : { color: '#6d28d9' }]}>
                        {isAutoSms ? '📱 Auto SMS' : '✏️ Manual'}
                      </Text>
                    </View>
                  </View>
                  {isLocked && (
                    <>
                      <View style={styles.detailDivider} />
                      <View style={[styles.detailRow, { backgroundColor: '#FEF2F2', borderRadius: BorderRadius.sm, padding: 8, marginTop: 4 }]}>
                        <Text style={{ fontSize: FontSize.xs, color: '#EF4444', fontWeight: '600' }}>🔒 This transaction is locked (older than 60 days)</Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Action buttons */}
                <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg }}>
                  <TouchableOpacity
                    style={[styles.detailBtn, { backgroundColor: isLocked ? colors.surface.border : colors.brand[500], flex: 2 }]}
                    disabled={isLocked}
                    onPress={() => { closeDetailSheet(); setTimeout(() => openEditModal(item), 200) }}
                  >
                    <Text style={[styles.detailBtnText, isLocked && { color: colors.ink[400] }]}>✏️ {isLocked ? 'Locked' : 'Edit'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.detailBtn, { backgroundColor: isLocked ? colors.surface.border : '#FEF2F2', flex: 1 }]}
                    disabled={isLocked}
                    onPress={() => { closeDetailSheet(); setTimeout(() => handleDelete(item), 200) }}
                  >
                    <Text style={[styles.detailBtnText, { color: isLocked ? colors.ink[400] : '#EF4444' }]}>🗑️ Delete</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )
          })()}
        </SafeAreaView>
      </Modal>

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? '✏️ Edit Transaction' : '+ New Transaction'}</Text>
              <TouchableOpacity onPress={closeModal}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>

            <View style={styles.typeToggleWrap}>
              <TouchableOpacity style={[styles.typeToggleBtn, expenseType === 'EXPENSE' && styles.typeToggleBtnExpenseActive]} onPress={() => { setExpenseType('EXPENSE'); setCategory('FOOD') }}>
                <Text style={[styles.typeToggleBtnText, expenseType === 'EXPENSE' && { color: '#fff' }]}>📤  Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeToggleBtn, expenseType === 'INCOME' && styles.typeToggleBtnIncomeActive]} onPress={() => { setExpenseType('INCOME'); setCategory('SALARY') }}>
                <Text style={[styles.typeToggleBtnText, expenseType === 'INCOME' && { color: '#fff' }]}>📥  Income</Text>
              </TouchableOpacity>
            </View>

            {!editingId && (
              <View style={styles.ocrContainer}>
                {scanning ? (
                  <View style={styles.ocrScanningWrapper}>
                    <ActivityIndicator color={colors.brand[500]} size="small" />
                    <Text style={styles.ocrScanningText}>AI reading receipt with Grok...</Text>
                  </View>
                ) : (
                  <View style={{ width: '100%' }}>
                    <Text style={styles.ocrLabel}>🤖 AI Auto-Fill from Receipt</Text>
                    <View style={styles.ocrButtonsRow}>
                      <TouchableOpacity style={styles.ocrBtn} onPress={handleScanCamera}><Text style={styles.ocrBtnText}>📷 Snap Receipt</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.ocrBtn} onPress={handleScanLibrary}><Text style={styles.ocrBtnText}>🖼️ Gallery</Text></TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {Platform.OS !== 'web' && clipboardBanner && (
              <TouchableOpacity style={styles.banner} onPress={handleApplyClipboard}>
                <Text style={styles.bannerEmoji}>✨</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bannerTitle}>Found transaction in clipboard!</Text>
                  <Text style={styles.bannerSubtitle}>{clipboardBanner.merchant} · ₹{clipboardBanner.amount}</Text>
                </View>
                <Text style={styles.bannerCta}>Auto-Fill</Text>
              </TouchableOpacity>
            )}

            {Platform.OS !== 'web' && !editingId && (
              <View style={styles.smsBox}>
                {!showSmsInput ? (
                  <TouchableOpacity onPress={() => setShowSmsInput(true)}><Text style={styles.smsCta}>✨ Parse Bank SMS</Text></TouchableOpacity>
                ) : (
                  <View style={{ width: '100%' }}>
                    <Text style={styles.smsLabel}>Paste Bank Transaction SMS</Text>
                    <TextInput style={styles.smsInput} multiline numberOfLines={2} placeholder="e.g. Your Account XX12 was debited by Rs. 550.00 at Swiggy..." placeholderTextColor={colors.ink[300]} value={smsText} onChangeText={setSmsText} />
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                      <TouchableOpacity onPress={() => { setShowSmsInput(false); setSmsText('') }} style={styles.smsBtnGhost}><Text style={styles.smsBtnTextGhost}>Cancel</Text></TouchableOpacity>
                      <TouchableOpacity onPress={handleParseManualSms} style={styles.smsBtn}><Text style={styles.smsBtnText}>Auto-Fill</Text></TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            <Text style={styles.label}>Amount (₹) *</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountPrefix}>₹</Text>
              <TextInput style={styles.amountInput} placeholder="0.00" placeholderTextColor={colors.ink[400]} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} returnKeyType="done" />
            </View>

            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput style={styles.input} placeholder={expenseType === 'INCOME' ? 'e.g. Monthly salary, Freelance payment...' : 'e.g. Lunch at Swiggy, Uber ride...'} placeholderTextColor={colors.ink[400]} value={title} onChangeText={setTitle} returnKeyType="done" />

            <Text style={styles.label}>Date</Text>
            {Platform.OS === 'web' ? (
              <View style={{ position: 'relative', width: '100%' }}>
                <style>{`
                  .custom-date-input::-webkit-calendar-picker-indicator {
                    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                    width: 100%; height: 100%; opacity: 0; cursor: pointer;
                  }
                `}</style>
                <input type="date" className="custom-date-input" value={date}
                  onChange={(e) => {
                    const val = e.target.value; setDate(val)
                    const parts = val.split('-')
                    if (parts.length === 3) setDateValue(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])))
                  }}
                  style={{ borderWidth: 1.5, borderStyle: 'solid', borderColor: '#E5E7EB', borderRadius: 10, paddingLeft: 16, paddingRight: 40, paddingTop: 12, paddingBottom: 12, fontSize: 16, color: '#111827', backgroundColor: '#fff', marginBottom: 8, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }}
                />
                <Text style={{ position: 'absolute', right: 16, top: 14, fontSize: 16, pointerEvents: 'none' }}>📅</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity style={styles.dateSelectorButton} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.dateSelectorText}>📅 {date}</Text>
                </TouchableOpacity>
                {showDatePicker && <DateTimePicker value={dateValue} mode="date" display="default" onChange={onChangeDate} />}
              </>
            )}

            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
              {activeCategories.map(c => (
                <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                  <Text style={styles.chipIcon}>{CATEGORY_ICONS[c] || '💳'}</Text>
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{CATEGORY_LABELS[c] || c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {!editingId && (
              <TouchableOpacity style={styles.recurringToggle} onPress={() => setIsRecurring(r => !r)}>
                <View style={[styles.recurringToggleDot, isRecurring && styles.recurringToggleDotActive]} />
                <Text style={styles.recurringToggleText}>🔁 Save as Recurring Template</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.submitBtn, expenseType === 'INCOME' && styles.submitBtnIncome]} onPress={handleSubmit} disabled={isPending}>
              {isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{editingId ? '✏️ Update Transaction' : expenseType === 'INCOME' ? '📥 Add Income' : '📤 Add Expense'}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface.soft },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: colors.ink[900] },
  subtitle: { fontSize: FontSize.xs, color: colors.ink[500], marginTop: 2 },
  addBtn: { backgroundColor: colors.brand[500], borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 8, ...Shadow.sm },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  monthTabs: { marginBottom: Spacing.md },
  monthTab: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: colors.surface.border, marginRight: 8, backgroundColor: colors.surface.white },
  monthTabActive: { backgroundColor: colors.brand[500], borderColor: colors.brand[500] },
  monthTabText: { fontSize: FontSize.xs, fontWeight: '700', color: colors.ink[700] },
  monthTabTextActive: { color: '#fff' },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  summaryCard: { flex: 1, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.sm },
  summaryCardLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', marginBottom: 4 },
  summaryCardValue: { fontSize: FontSize.md, fontWeight: '800', color: '#fff' },
  sectionCard: { backgroundColor: colors.surface.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.sm },
  cardTitle: { fontSize: FontSize.md, fontWeight: '800', color: colors.ink[900], marginBottom: Spacing.sm },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  catLeft: { flexDirection: 'row', alignItems: 'center', width: 90, gap: 4 },
  catIcon: { fontSize: 15 },
  catLabel: { fontSize: FontSize.xs, fontWeight: '600', color: colors.ink[700], flex: 1 },
  catBarWrap: { flex: 1, height: 8, backgroundColor: colors.surface.border, borderRadius: 4, overflow: 'hidden' },
  catBar: { height: 8, borderRadius: 4 },
  catAmount: { fontSize: FontSize.xs, fontWeight: '700', color: colors.ink[700], width: 64, textAlign: 'right' },
  legendText: { fontSize: FontSize.xs, color: colors.ink[500], fontWeight: '600' },
  searchInput: { backgroundColor: colors.surface.white, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: colors.surface.border, paddingHorizontal: Spacing.md, paddingVertical: 10, fontSize: FontSize.sm, color: colors.ink[900], marginBottom: Spacing.sm },
  filterChip: { paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: colors.surface.border, marginRight: 6, backgroundColor: colors.surface.white },
  filterChipActive: { backgroundColor: colors.brand[500], borderColor: colors.brand[500] },
  filterChipText: { fontSize: 11, fontWeight: '700', color: colors.ink[700] },
  filterChipTextActive: { color: '#fff' },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '800', color: colors.ink[500], textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: Spacing.sm },
  expenseCard: { backgroundColor: colors.surface.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', ...Shadow.sm },
  expenseCardLocked: { opacity: 0.65 },
  expenseIcon: { width: 46, height: 46, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  expenseTitle: { fontSize: FontSize.sm, fontWeight: '700', color: colors.ink[900] },
  expenseMeta: { fontSize: FontSize.xs, color: colors.ink[500], marginTop: 2 },
  expenseAmount: { fontSize: FontSize.md, fontWeight: '800' },
  deleteText: { fontSize: 12, color: '#EF4444', marginTop: 4, fontWeight: '700' },
  lockedBadge: { fontSize: 10, color: colors.ink[400], marginTop: 4, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: FontSize.md, fontWeight: '700', color: colors.ink[700] },
  emptySubText: { fontSize: FontSize.sm, color: colors.ink[400], marginTop: 6 },
  modal: { padding: Spacing.xl, backgroundColor: colors.surface.soft, flexGrow: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: colors.ink[900] },
  modalClose: { fontSize: 22, color: colors.ink[400], fontWeight: '600' },
  typeToggleWrap: { flexDirection: 'row', backgroundColor: colors.surface.border, borderRadius: BorderRadius.md, padding: 3, marginBottom: Spacing.md },
  typeToggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.sm },
  typeToggleBtnExpenseActive: { backgroundColor: '#EF4444' },
  typeToggleBtnIncomeActive: { backgroundColor: '#10B981' },
  typeToggleBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: colors.ink[700] },
  ocrContainer: { backgroundColor: colors.surface.soft, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1.5, borderColor: colors.surface.border, alignItems: 'center' },
  ocrScanningWrapper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  ocrScanningText: { fontSize: FontSize.sm, fontWeight: '600', color: colors.brand[500] },
  ocrLabel: { fontSize: FontSize.xs, fontWeight: '800', color: colors.ink[500], marginBottom: Spacing.sm, textTransform: 'uppercase' },
  ocrButtonsRow: { flexDirection: 'row', gap: Spacing.md, width: '100%' },
  ocrBtn: { flex: 1, backgroundColor: colors.surface.white, borderWidth: 1.5, borderColor: colors.brand[100], borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center', ...Shadow.sm },
  ocrBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: colors.brand[500] },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0e7ff', borderWidth: 1.5, borderColor: '#3b82f6', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm },
  bannerEmoji: { fontSize: 20 },
  bannerTitle: { fontSize: FontSize.sm, fontWeight: '700', color: '#1e1b4b' },
  bannerSubtitle: { fontSize: FontSize.xs, color: '#312e81', marginTop: 2 },
  bannerCta: { fontSize: FontSize.xs, fontWeight: '800', color: colors.brand[500] },
  smsBox: { backgroundColor: colors.surface.white, borderWidth: 1, borderColor: colors.surface.border, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, alignItems: 'center' },
  smsCta: { fontSize: FontSize.sm, fontWeight: '700', color: colors.brand[500] },
  smsLabel: { fontSize: FontSize.xs, fontWeight: '700', color: colors.ink[500], textTransform: 'uppercase', marginBottom: 6 },
  smsInput: { width: '100%', minHeight: 60, borderWidth: 1, borderColor: colors.surface.border, borderRadius: BorderRadius.md, backgroundColor: colors.surface.soft, padding: Spacing.sm, fontSize: FontSize.sm, color: colors.ink[900], marginBottom: Spacing.sm },
  smsBtnGhost: { paddingVertical: 6, paddingHorizontal: 12 },
  smsBtnTextGhost: { color: colors.ink[500], fontSize: FontSize.xs, fontWeight: '600' },
  smsBtn: { backgroundColor: colors.brand[500], paddingVertical: 6, paddingHorizontal: 12, borderRadius: BorderRadius.sm },
  smsBtnText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },
  amountRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.surface.border, borderRadius: BorderRadius.md, backgroundColor: colors.surface.white, marginBottom: Spacing.sm, paddingHorizontal: Spacing.md },
  amountPrefix: { fontSize: FontSize.xl, fontWeight: '800', color: colors.ink[500], marginRight: 6 },
  amountInput: { flex: 1, paddingVertical: 14, fontSize: FontSize.xl, fontWeight: '800', color: colors.ink[900] },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: colors.ink[700], marginBottom: 6, marginTop: Spacing.sm },
  input: { borderWidth: 1.5, borderColor: colors.surface.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 12, fontSize: FontSize.md, color: colors.ink[900], backgroundColor: colors.surface.white, marginBottom: Spacing.sm },
  dateSelectorButton: { borderWidth: 1.5, borderColor: colors.surface.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 12, backgroundColor: colors.surface.white, marginBottom: Spacing.sm },
  dateSelectorText: { fontSize: FontSize.md, color: colors.ink[900], fontWeight: '500' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: colors.surface.border, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 8, marginRight: 8, backgroundColor: colors.surface.white },
  chipActive: { backgroundColor: colors.brand[500], borderColor: colors.brand[500] },
  chipIcon: { fontSize: 14 },
  chipText: { fontSize: FontSize.xs, color: colors.ink[700], fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: colors.brand[500], borderRadius: BorderRadius.md, paddingVertical: 15, alignItems: 'center', marginTop: Spacing.xl, ...Shadow.sm },
  submitBtnIncome: { backgroundColor: '#10B981' },
  submitText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },

  // Insights
  insightRow: { borderRadius: BorderRadius.sm, padding: 10, marginBottom: 6 },
  insightDanger: { backgroundColor: '#FEF2F2', borderLeftWidth: 3, borderLeftColor: '#EF4444' },
  insightWarning: { backgroundColor: '#FFFBEB', borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  insightSuccess: { backgroundColor: '#F0FDF4', borderLeftWidth: 3, borderLeftColor: '#10B981' },
  insightText: { fontSize: FontSize.xs, fontWeight: '600', color: colors.ink[700] },

  // Budget subtext
  budgetSubtext: { fontSize: 10, fontWeight: '600', marginTop: -6, marginBottom: 8, paddingLeft: 19 },

  // Recurring templates strip
  recurringCard: { backgroundColor: colors.surface.soft, borderRadius: BorderRadius.md, padding: Spacing.sm, marginRight: Spacing.sm, width: 120, borderWidth: 1.5, borderColor: colors.surface.border, alignItems: 'center', position: 'relative' },
  recurringIcon: { fontSize: 22, marginBottom: 4 },
  recurringTitle: { fontSize: 10, fontWeight: '700', color: colors.ink[700], textAlign: 'center' },
  recurringAmount: { fontSize: FontSize.xs, fontWeight: '800', color: colors.brand[500], marginTop: 2 },
  recurringDel: { position: 'absolute', top: 4, right: 4, padding: 2 },

  // Recurring toggle in modal
  recurringToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: Spacing.md, marginBottom: Spacing.sm, padding: Spacing.md, backgroundColor: colors.surface.white, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: colors.surface.border },
  recurringToggleDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.surface.border, backgroundColor: 'transparent' },
  recurringToggleDotActive: { backgroundColor: colors.brand[500], borderColor: colors.brand[500] },
  recurringToggleText: { fontSize: FontSize.sm, fontWeight: '600', color: colors.ink[700] },

  // Export button
  exportBtn: { backgroundColor: colors.surface.white, borderWidth: 1.5, borderColor: colors.surface.border, borderRadius: BorderRadius.md, width: 42, height: 42, alignItems: 'center', justifyContent: 'center', ...Shadow.sm },
  exportBtnText: { fontSize: 18 },

  // SMS badge on transaction card
  smsBadge: { backgroundColor: '#E0F2FE', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  smsBadgeText: { fontSize: 10 },
  lockBadge: { backgroundColor: colors.surface.border, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  lockBadgeText: { fontSize: 10 },

  // 6-month trend monthly strip
  trendMonthChip: { backgroundColor: colors.surface.soft, borderRadius: BorderRadius.sm, padding: 8, marginRight: 8, alignItems: 'center', minWidth: 60, borderWidth: 1, borderColor: colors.surface.border },
  trendMonthLabel: { fontSize: 9, fontWeight: '700', color: colors.ink[500], textTransform: 'uppercase', marginBottom: 2 },
  trendMonthExpense: { fontSize: 11, fontWeight: '800', color: '#EF4444' },
  trendMonthIncome: { fontSize: 10, fontWeight: '700', color: '#10B981', marginTop: 1 },

  // Transaction detail sheet
  detailAmountCard: { alignItems: 'center', borderRadius: BorderRadius.xl, borderWidth: 1.5, padding: Spacing.xl, marginBottom: Spacing.lg },
  detailAmount: { fontSize: 36, fontWeight: '900', letterSpacing: -1, marginBottom: 10 },
  detailCategoryBadge: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 6, marginTop: 4 },
  detailCategoryText: { fontSize: FontSize.sm, fontWeight: '800' },
  detailCard: { backgroundColor: colors.surface.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadow.sm, marginBottom: Spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  detailRowLabel: { fontSize: FontSize.xs, fontWeight: '700', color: colors.ink[400], textTransform: 'uppercase', letterSpacing: 0.4 },
  detailRowValue: { fontSize: FontSize.sm, fontWeight: '600', color: colors.ink[900], flex: 1, textAlign: 'right' },
  detailDivider: { height: 1, backgroundColor: colors.surface.border },
  sourceBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  sourceBadgeSms: { backgroundColor: '#E0F2FE' },
  sourceBadgeManual: { backgroundColor: '#EDE9FE' },
  sourceBadgeText: { fontSize: 12, fontWeight: '700' },
  detailBtn: { borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center', ...Shadow.sm },
  detailBtnText: { fontSize: FontSize.sm, fontWeight: '800', color: '#fff' },
}))
