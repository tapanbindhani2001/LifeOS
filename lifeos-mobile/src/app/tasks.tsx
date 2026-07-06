import { useState } from 'react'
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Alert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/features'
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '../constants/theme'
import Toast from 'react-native-toast-message'

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE']

const priorityColor: Record<string, string> = {
  LOW: Colors.status.success,
  MEDIUM: Colors.brand[500],
  HIGH: Colors.status.warning,
  URGENT: Colors.status.error,
}

export default function TasksScreen() {
  const qc = useQueryClient()
  const { data: tasks = [], isLoading } = useQuery({ queryKey: ['tasks'], queryFn: tasksApi.list })

  const createTask = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setModalOpen(false); setTitle(''); setDescription('') },
    onError: (e: any) => Toast.show({ type: 'error', text1: e.message }),
  })

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => tasksApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const deleteTask = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('MEDIUM')

  const handleCreate = () => {
    if (!title.trim()) { Toast.show({ type: 'error', text1: 'Title is required' }); return }
    createTask.mutate({ title, description, priority, status: 'TODO' })
  }

  const handleToggle = (task: any) => {
    const newStatus = task.status === 'DONE' ? 'TODO' : 'DONE'
    updateTask.mutate({ id: task.id, data: { ...task, status: newStatus } })
  }

  const handleDelete = (id: string) => {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTask.mutate(id) },
    ])
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tasks</Text>
          <Text style={styles.subtitle}>{tasks.length} total</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalOpen(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.brand[500]} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ padding: Spacing.lg, paddingTop: 0 }}
          renderItem={({ item }) => (
            <View style={styles.taskCard}>
              <TouchableOpacity onPress={() => handleToggle(item)} style={styles.checkbox}>
                {item.status === 'DONE' && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[styles.taskTitle, item.status === 'DONE' && styles.done]} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.description ? (
                  <Text style={styles.taskDesc} numberOfLines={1}>{item.description}</Text>
                ) : null}
                <View style={styles.tagRow}>
                  <View style={[styles.tag, { backgroundColor: (priorityColor[item.priority] ?? Colors.brand[500]) + '20' }]}>
                    <Text style={[styles.tagText, { color: priorityColor[item.priority] ?? Colors.brand[500] }]}>{item.priority}</Text>
                  </View>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{item.status}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>🗑</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No tasks yet. Tap + Add to get started!</Text>}
        />
      )}

      {/* Create Modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Task</Text>
            <TouchableOpacity onPress={() => setModalOpen(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
          </View>

          <Text style={styles.label}>Title *</Text>
          <TextInput style={styles.input} placeholder="What needs to be done?" value={title} onChangeText={setTitle} />

          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, { height: 80 }]} placeholder="Optional details..." multiline value={description} onChangeText={setDescription} />

          <Text style={styles.label}>Priority</Text>
          <View style={styles.row}>
            {PRIORITIES.map(p => (
              <TouchableOpacity key={p} style={[styles.chip, priority === p && styles.chipActive]} onPress={() => setPriority(p)}>
                <Text style={[styles.chipText, priority === p && styles.chipTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={createTask.isPending}>
            {createTask.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Task</Text>}
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
  taskCard: { backgroundColor: Colors.surface.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'flex-start', ...Shadow.sm },
  checkbox: { width: 22, height: 22, borderRadius: BorderRadius.sm, borderWidth: 2, borderColor: Colors.brand[300], marginRight: Spacing.sm, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkmark: { color: Colors.brand[500], fontWeight: '700', fontSize: 13 },
  taskTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.ink[900] },
  done: { textDecorationLine: 'line-through', color: Colors.ink[400] },
  taskDesc: { fontSize: FontSize.sm, color: Colors.ink[500], marginTop: 2 },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  tag: { backgroundColor: Colors.surface.soft, borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.ink[500] },
  deleteBtn: { padding: 4 },
  deleteText: { fontSize: 16 },
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
