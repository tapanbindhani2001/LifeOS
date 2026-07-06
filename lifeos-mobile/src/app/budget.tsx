import { useState } from 'react'
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Alert, ScrollView
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { budgetApi } from '../api/features'
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '../constants/theme'
import Toast from 'react-native-toast-message'

const CATEGORIES = [
  { key: 'FOOD', label: 'Food', emoji: '🍔' },
  { key: 'RENT', label: 'Rent', emoji: '🏠' },
  { key: 'TRANSPORT', label: 'Transport', emoji: '🚗' },
  { key: 'SHOPPING', label: 'Shopping', emoji: '🛍️' },
  { key: 'BILLS', label: 'Bills', emoji: '📄' },
  { key: 'ENTERTAINMENT', label: 'Entertainment', emoji: '🎬' },
  { key: 'HEALTH', label: 'Health', emoji: '💊' },
  { key: 'OTHER', label: 'Other', emoji: '📦' },
]

function formatINR(amount: number) {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'OVER_BUDGET': return { bar: '#EF4444', badge: '#FEF2F2', badgeText: '#B91C1C', label: '🚨 Over Budget' }
    case 'WARNING':     return { bar: '#F59E0B', badge: '#FFFBEB', badgeText: '#92400E', label: '⚠️ Warning' }
    default:            return { bar: '#10B981', badge: '#ECFDF5', badgeText: '#065F46', label: '✅ On Track' }
  }
}

function BudgetCard({
  budget,
  onEdit,
  onDelete,
}: {
  budget: any
  onEdit: () => void
  onDelete: () => void
}) {
  const cfg = getStatusConfig(budget.status)
  const displayPct = Math.min(budget.percentage, 100)
  const catMeta = CATEGORIES.find(c => c.key === budget.category)
  const remaining = budget.monthlyLimit - budget.spent

  return (
    <View style={[card.container, Shadow.sm]}>
      <View style={card.topRow}>
        <View style={card.labelRow}>
          <View style={card.emojiWrap}>
            <Text style={card.emoji}>{catMeta?.emoji ?? '💰'}</Text>
          </View>
          <View>
            <Text style={card.catLabel}>{catMeta?.label ?? budget.category}</Text>
            <Text style={card.limitText}>Limit: {formatINR(budget.monthlyLimit)}/mo</Text>
          </View>
        </View>
        <View style={card.actions}>
          <TouchableOpacity onPress={onEdit} style={card.actionBtn}>
            <Text style={card.actionBtnText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={[card.actionBtn, { marginLeft: 4 }]}>
            <Text style={card.actionBtnText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress bar */}
      <View style={card.barBg}>
        <View style={[card.barFill, { width: `${displayPct}%` as any, backgroundColor: cfg.bar }]} />
      </View>

      {/* Stats row */}
      <View style={card.statsRow}>
        <Text style={card.statsSpent}>{formatINR(budget.spent)} spent</Text>
        <Text style={card.statsPct}>{budget.percentage.toFixed(1)}%</Text>
      </View>

      {/* Badge + remaining */}
      <View style={card.bottomRow}>
        <View style={[card.badge, { backgroundColor: cfg.badge }]}>
          <Text style={[card.badgeText, { color: cfg.badgeText }]}>{cfg.label}</Text>
        </View>
        {budget.status !== 'OVER_BUDGET' ? (
          <Text style={card.remaining}>{formatINR(remaining)} left</Text>
        ) : (
          <Text style={[card.remaining, { color: '#EF4444' }]}>Over by {formatINR(-remaining)}</Text>
        )}
      </View>
    </View>
  )
}

function SetBudgetModal({
  visible,
  initial,
  onClose,
  onSave,
  saving,
}: {
  visible: boolean
  initial: { category: string; monthlyLimit: number } | null
  onClose: () => void
  onSave: (category: string, limit: number) => void
  saving: boolean
}) {
  const [category, setCategory] = useState(initial?.category ?? 'FOOD')
  const [limit, setLimit] = useState(initial ? String(initial.monthlyLimit) : '')

  const handleSave = () => {
    const n = parseFloat(limit)
    if (isNaN(n) || n < 1) {
      Toast.show({ type: 'error', text1: 'Please enter a valid amount' })
      return
    }
    onSave(initial ? initial.category : category, n)
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <Text style={modal.title}>{initial ? 'Edit Budget Limit' : 'Set Budget Limit'}</Text>

          {!initial && (
            <View style={modal.section}>
              <Text style={modal.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modal.catScroll}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity
                    key={c.key}
                    style={[modal.catChip, category === c.key && modal.catChipActive]}
                    onPress={() => setCategory(c.key)}
                  >
                    <Text style={modal.catEmoji}>{c.emoji}</Text>
                    <Text style={[modal.catChipText, category === c.key && modal.catChipTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={modal.section}>
            <Text style={modal.label}>Monthly Limit (₹)</Text>
            <TextInput
              style={modal.input}
              placeholder="e.g. 5000"
              placeholderTextColor={Colors.ink[300]}
              keyboardType="numeric"
              value={limit}
              onChangeText={setLimit}
              autoFocus
            />
          </View>

          <View style={modal.btnRow}>
            <TouchableOpacity style={modal.cancelBtn} onPress={onClose}>
              <Text style={modal.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modal.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={modal.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

export default function BudgetScreen() {
  const qc = useQueryClient()
  const [modalVisible, setModalVisible] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [newCategory, setNewCategory] = useState<string | null>(null)

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: budgetApi.list,
  })

  const upsert = useMutation({
    mutationFn: ({ category, monthlyLimit }: { category: string; monthlyLimit: number }) =>
      budgetApi.upsert({ category, monthlyLimit }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] })
      Toast.show({ type: 'success', text1: 'Budget saved' })
      setModalVisible(false)
      setEditTarget(null)
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e.message || 'Failed to save budget' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => budgetApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] })
      Toast.show({ type: 'success', text1: 'Budget removed' })
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e.message || 'Failed to remove budget' }),
  })

  const budgetedKeys = new Set((budgets as any[]).map(b => b.category))
  const unbudgeted = CATEGORIES.filter(c => !budgetedKeys.has(c.key))

  const totalBudgeted = (budgets as any[]).reduce((s, b) => s + b.monthlyLimit, 0)
  const totalSpent = (budgets as any[]).reduce((s, b) => s + b.spent, 0)
  const overCount = (budgets as any[]).filter(b => b.status === 'OVER_BUDGET').length

  const openNew = (categoryKey?: string) => {
    setEditTarget(null)
    setNewCategory(categoryKey ?? null)
    setModalVisible(true)
  }

  const openEdit = (budget: any) => {
    setEditTarget(budget)
    setModalVisible(true)
  }

  const confirmDelete = (id: string, label: string) => {
    Alert.alert('Remove Budget', `Remove budget limit for ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ])
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Budget Planner</Text>
          <Text style={s.subtitle}>Track monthly spending limits</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => openNew()}>
          <Text style={s.addBtnText}>+ Set</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Strip */}
      <View style={s.summaryStrip}>
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>Budgeted</Text>
          <Text style={s.summaryValue}>{formatINR(totalBudgeted)}</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>Spent</Text>
          <Text style={[s.summaryValue, totalSpent > totalBudgeted && { color: '#EF4444' }]}>
            {formatINR(totalSpent)}
          </Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>Alerts</Text>
          <Text style={[s.summaryValue, overCount > 0 && { color: '#EF4444' }]}>
            {overCount > 0 ? `${overCount} over` : '✓ Clear'}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.brand[500]} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={budgets as any[]}
          keyExtractor={item => item.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <BudgetCard
              budget={item}
              onEdit={() => openEdit(item)}
              onDelete={() => {
                const label = CATEGORIES.find(c => c.key === item.category)?.label ?? item.category
                confirmDelete(item.id, label)
              }}
            />
          )}
          ListFooterComponent={
            unbudgeted.length > 0 ? (
              <View>
                <Text style={s.sectionLabel}>Unbudgeted Categories</Text>
                {unbudgeted.map(c => (
                  <TouchableOpacity key={c.key} style={s.unbudgetedRow} onPress={() => openNew(c.key)}>
                    <View style={s.unbudgetedLeft}>
                      <Text style={s.unbudgetedEmoji}>{c.emoji}</Text>
                      <View>
                        <Text style={s.unbudgetedLabel}>{c.label}</Text>
                        <Text style={s.unbudgetedSub}>No limit set</Text>
                      </View>
                    </View>
                    <Text style={s.unbudgetedCta}>+ Set Limit</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null
          }
          ListEmptyComponent={
            unbudgeted.length === CATEGORIES.length ? (
              <View style={s.empty}>
                <Text style={{ fontSize: 44, marginBottom: 12 }}>💰</Text>
                <Text style={s.emptyTitle}>No budgets yet</Text>
                <Text style={s.emptyDesc}>Set monthly limits to track where your money goes.</Text>
                <TouchableOpacity style={s.emptyBtn} onPress={() => openNew()}>
                  <Text style={s.emptyBtnText}>Set Your First Budget</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      <SetBudgetModal
        visible={modalVisible}
        initial={
          editTarget
            ? { category: editTarget.category, monthlyLimit: editTarget.monthlyLimit }
            : newCategory
            ? { category: newCategory, monthlyLimit: 0 }
            : null
        }
        onClose={() => { setModalVisible(false); setEditTarget(null) }}
        onSave={(category, limit) => upsert.mutate({ category, monthlyLimit: limit })}
        saving={upsert.isPending}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface.soft },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, paddingBottom: Spacing.md },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.ink[900] },
  subtitle: { fontSize: FontSize.xs, color: Colors.ink[400], marginTop: 2 },
  addBtn: { backgroundColor: Colors.brand[500], paddingHorizontal: 14, paddingVertical: 7, borderRadius: BorderRadius.sm },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  summaryStrip: { flexDirection: 'row', backgroundColor: Colors.surface.white, marginHorizontal: Spacing.lg, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.sm, marginBottom: Spacing.md },
  summaryCard: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.ink[400], marginBottom: 2 },
  summaryValue: { fontSize: FontSize.md, fontWeight: '800', color: Colors.ink[900] },
  summaryDivider: { width: 1, backgroundColor: Colors.surface.border },
  list: { padding: Spacing.lg, gap: Spacing.md },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.ink[400], textTransform: 'uppercase', letterSpacing: 0.8, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  unbudgetedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.surface.border, borderStyle: 'dashed' },
  unbudgetedLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  unbudgetedEmoji: { fontSize: 22 },
  unbudgetedLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.ink[700] },
  unbudgetedSub: { fontSize: FontSize.xs, color: Colors.ink[400] },
  unbudgetedCta: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.brand[500] },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.ink[900], marginBottom: 6 },
  emptyDesc: { fontSize: FontSize.sm, color: Colors.ink[400], textAlign: 'center', marginBottom: 20 },
  emptyBtn: { backgroundColor: Colors.brand[500], paddingHorizontal: 20, paddingVertical: 10, borderRadius: BorderRadius.md },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
})

const card = StyleSheet.create({
  container: { backgroundColor: Colors.surface.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  emojiWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.surface.soft, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 20 },
  catLabel: { fontSize: FontSize.md, fontWeight: '700', color: Colors.ink[900] },
  limitText: { fontSize: FontSize.xs, color: Colors.ink[400], marginTop: 1 },
  actions: { flexDirection: 'row' },
  actionBtn: { padding: 5 },
  actionBtnText: { fontSize: 14 },
  barBg: { height: 8, backgroundColor: Colors.surface.soft, borderRadius: 4, overflow: 'hidden', marginBottom: Spacing.xs },
  barFill: { height: 8, borderRadius: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  statsSpent: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.ink[700] },
  statsPct: { fontSize: FontSize.xs, color: Colors.ink[400] },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  remaining: { fontSize: FontSize.xs, color: Colors.ink[500], fontWeight: '600' },
})

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, paddingBottom: 36 },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.ink[900], marginBottom: Spacing.lg },
  section: { marginBottom: Spacing.lg },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.ink[500], marginBottom: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  catScroll: { marginHorizontal: -4 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5, borderColor: Colors.ink[200], marginHorizontal: 4, backgroundColor: Colors.surface.soft },
  catChipActive: { borderColor: Colors.brand[500], backgroundColor: '#EEF2FF' },
  catEmoji: { fontSize: 14 },
  catChipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.ink[500] },
  catChipTextActive: { color: Colors.brand[500] },
  input: { borderWidth: 1.5, borderColor: Colors.ink[200], borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 48, fontSize: FontSize.md, color: Colors.ink[900], backgroundColor: Colors.surface.soft },
  btnRow: { flexDirection: 'row', gap: Spacing.sm },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.ink[200], alignItems: 'center' },
  cancelText: { fontWeight: '700', color: Colors.ink[700], fontSize: FontSize.sm },
  saveBtn: { flex: 2, paddingVertical: 13, borderRadius: BorderRadius.md, backgroundColor: Colors.brand[500], alignItems: 'center' },
  saveText: { fontWeight: '800', color: '#fff', fontSize: FontSize.sm },
})
