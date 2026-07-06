import { useState } from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { habitsApi } from '../api/features'
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '../constants/theme'
import Toast from 'react-native-toast-message'

const FREQUENCIES = ['DAILY', 'WEEKLY']

export default function HabitsScreen() {
  const qc = useQueryClient()
  const { data: habits = [], isLoading } = useQuery({ queryKey: ['habits'], queryFn: habitsApi.list })

  const createHabit = useMutation({
    mutationFn: habitsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['habits'] }); setModalOpen(false); setName(''); setFrequency('DAILY') },
    onError: (e: any) => Toast.show({ type: 'error', text1: e.message }),
  })

  const logHabit = useMutation({
    mutationFn: habitsApi.logCheckIn,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['habits'] }); Toast.show({ type: 'success', text1: '🔥 Logged!' }) },
  })

  const deleteHabit = useMutation({
    mutationFn: habitsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState('DAILY')
  const [targetDays, setTargetDays] = useState('7')

  const handleCreate = () => {
    if (!name.trim()) { Toast.show({ type: 'error', text1: 'Name is required' }); return }
    createHabit.mutate({ name, description, frequency, targetCount: parseInt(targetDays) || 1 })
  }

  const handleDelete = (id: string) => {
    Alert.alert('Delete Habit', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteHabit.mutate(id) },
    ])
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Habits</Text>
          <Text style={styles.subtitle}>Build streaks that stick</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalOpen(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.brand[500]} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={habits}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ padding: Spacing.lg, paddingTop: 0 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <Text style={styles.habitEmoji}>💪</Text>
                <View>
                  <Text style={styles.habitName}>{item.name}</Text>
                  <Text style={styles.habitFreq}>{item.frequency}</Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <View style={styles.streak}>
                  <Text style={styles.streakText}>🔥 {item.currentStreak ?? 0}</Text>
                </View>
                <TouchableOpacity style={styles.logBtn} onPress={() => logHabit.mutate(item.id)}>
                  <Text style={styles.logBtnText}>Log</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ marginLeft: 6 }}>
                  <Text style={{ fontSize: 16 }}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No habits yet. Build your first streak!</Text>}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Habit</Text>
            <TouchableOpacity onPress={() => setModalOpen(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
          </View>

          <Text style={styles.label}>Name *</Text>
          <TextInput style={styles.input} placeholder="e.g., Morning Run" value={name} onChangeText={setName} />

          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, { height: 72 }]} placeholder="Optional goal..." multiline value={description} onChangeText={setDescription} />

          <Text style={styles.label}>Frequency</Text>
          <View style={styles.row}>
            {FREQUENCIES.map(f => (
              <TouchableOpacity key={f} style={[styles.chip, frequency === f && styles.chipActive]} onPress={() => setFrequency(f)}>
                <Text style={[styles.chipText, frequency === f && styles.chipTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Target Days</Text>
          <TextInput style={styles.input} placeholder="7" keyboardType="number-pad" value={targetDays} onChangeText={setTargetDays} />

          <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={createHabit.isPending}>
            {createHabit.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Habit</Text>}
          </TouchableOpacity>
        </View>
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
  card: { backgroundColor: Colors.surface.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...Shadow.sm },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  habitEmoji: { fontSize: 24 },
  habitName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.ink[900] },
  habitFreq: { fontSize: FontSize.xs, color: Colors.ink[500] },
  streak: { backgroundColor: Colors.brand[50], borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  streakText: { color: Colors.brand[700], fontSize: FontSize.xs, fontWeight: '700' },
  logBtn: { backgroundColor: Colors.status.success, borderRadius: BorderRadius.sm, paddingHorizontal: 10, paddingVertical: 5 },
  logBtnText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },
  empty: { textAlign: 'center', color: Colors.ink[400], marginTop: 60, fontSize: FontSize.sm },
  modal: { flex: 1, padding: Spacing.xl, backgroundColor: Colors.surface.soft },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.ink[900] },
  modalClose: { fontSize: 20, color: Colors.ink[500] },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.ink[700], marginBottom: 6, marginTop: Spacing.sm },
  input: { borderWidth: 1.5, borderColor: Colors.ink[200], borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 12, fontSize: FontSize.md, color: Colors.ink[900], backgroundColor: Colors.surface.white, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  chip: { borderWidth: 1.5, borderColor: Colors.ink[200], borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  chipActive: { backgroundColor: Colors.brand[500], borderColor: Colors.brand[500] },
  chipText: { fontSize: FontSize.sm, color: Colors.ink[700], fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: Colors.brand[500], borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.xl },
  submitText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
})
