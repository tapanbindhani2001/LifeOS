import { useState } from 'react'
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Alert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { goalsApi } from '../api/features'
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '../constants/theme'
import Toast from 'react-native-toast-message'
import { router } from 'expo-router'

export default function GoalsScreen() {
  const qc = useQueryClient()
  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: goalsApi.list,
  })

  const createGoal = useMutation({
    mutationFn: goalsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      setModalOpen(false)
      resetForm()
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e.message }),
  })

  const updateGoal = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => goalsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      Toast.show({ type: 'success', text1: 'Goal updated!' })
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e.message }),
  })

  const deleteGoal = useMutation({
    mutationFn: goalsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetDate, setTargetDate] = useState('')

  const resetForm = () => { setTitle(''); setDescription(''); setTargetDate('') }

  const handleCreate = () => {
    if (!title.trim()) {
      Toast.show({ type: 'error', text1: 'Title is required' })
      return
    }
    createGoal.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      targetDate: targetDate || undefined,
      progress: 0,
      completed: false,
    })
  }

  const handleIncrementProgress = (item: any) => {
    const nextProgress = Math.min((item.progress ?? 0) + 10, 100)
    const isComplete = nextProgress >= 100
    updateGoal.mutate({
      id: item.id,
      data: { progress: nextProgress, completed: isComplete },
    })
  }

  const handleMarkComplete = (item: any) => {
    updateGoal.mutate({
      id: item.id,
      data: { progress: 100, completed: true },
    })
  }

  const handleDelete = (id: string) => {
    Alert.alert('Delete Goal', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGoal.mutate(id) },
    ])
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Goals</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalOpen(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.brand[500]} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={goals as any[]}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ padding: Spacing.lg, paddingTop: 0 }}
          renderItem={({ item }) => {
            const progress = item.progress ?? 0
            return (
              <View style={[styles.goalCard, item.completed && styles.goalCardDone]}>
                <View style={styles.goalTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.goalTitle, item.completed && styles.goalTitleDone]}>{item.title}</Text>
                    {item.description ? <Text style={styles.goalDesc}>{item.description}</Text> : null}
                    {item.targetDate ? (
                      <Text style={styles.goalDate}>🗓 Due: {item.targetDate.slice(0, 10)}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(item.id)}>
                    <Text style={{ fontSize: 16 }}>🗑</Text>
                  </TouchableOpacity>
                </View>

                {/* Progress bar */}
                <View style={styles.progWrap}>
                  <View style={styles.barBg}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${progress}%` as any,
                          backgroundColor: item.completed ? Colors.status.success : '#8b5cf6',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.pctText}>{progress}%</Text>
                </View>

                {!item.completed && (
                  <View style={styles.goalActions}>
                    <TouchableOpacity
                      style={styles.progressBtn}
                      onPress={() => handleIncrementProgress(item)}
                      disabled={updateGoal.isPending}
                    >
                      <Text style={styles.progressText}>+10%</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.progressBtn, { backgroundColor: Colors.status.success + '20' }]}
                      onPress={() => handleMarkComplete(item)}
                      disabled={updateGoal.isPending}
                    >
                      <Text style={[styles.progressText, { color: Colors.status.success }]}>Mark Done ✓</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {item.completed && (
                  <Text style={styles.completedBadge}>✅ Completed</Text>
                )}
              </View>
            )
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>No goals yet. Set your first vision!</Text>
          }
        />
      )}

      {/* Create Modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Goal</Text>
            <TouchableOpacity onPress={() => setModalOpen(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
          </View>

          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Read 20 books this year"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, { height: 72 }]}
            placeholder="Optional notes..."
            multiline
            value={description}
            onChangeText={setDescription}
          />

          <Text style={styles.label}>Target Date (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={targetDate}
            onChangeText={setTargetDate}
          />

          <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={createGoal.isPending}>
            {createGoal.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Goal</Text>}
          </TouchableOpacity>
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
  goalCard: {
    backgroundColor: Colors.surface.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  goalCardDone: { opacity: 0.8 },
  goalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  goalTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.ink[900] },
  goalTitleDone: { textDecorationLine: 'line-through', color: Colors.ink[400] },
  goalDesc: { fontSize: FontSize.xs, color: Colors.ink[500], marginTop: 2 },
  goalDate: { fontSize: FontSize.xs, color: Colors.brand[600], marginTop: 4, fontWeight: '600' },
  progWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  barBg: { flex: 1, height: 8, borderRadius: BorderRadius.full, backgroundColor: Colors.surface.soft },
  barFill: { height: '100%', borderRadius: BorderRadius.full },
  pctText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.ink[700], minWidth: 32, textAlign: 'right' },
  goalActions: { flexDirection: 'row', gap: Spacing.sm },
  progressBtn: {
    backgroundColor: Colors.brand[50],
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  progressText: { color: Colors.brand[600], fontSize: FontSize.xs, fontWeight: '700' },
  completedBadge: { fontSize: FontSize.sm, color: Colors.status.success, fontWeight: '700' },
  empty: { textAlign: 'center', color: Colors.ink[400], marginTop: 60, fontSize: FontSize.sm },
  modal: { flex: 1, padding: Spacing.xl, backgroundColor: Colors.surface.soft },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.ink[900] },
  modalClose: { fontSize: 20, color: Colors.ink[500] },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.ink[700], marginBottom: 6, marginTop: Spacing.sm },
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
  submitBtn: {
    backgroundColor: Colors.brand[500],
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
})
