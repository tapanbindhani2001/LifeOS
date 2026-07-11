import { useState, useEffect } from 'react'
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Alert, ScrollView
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notesApi } from '../api/features'
import { Spacing, BorderRadius, FontSize, Shadow } from '../constants/theme'
import { useTheme, makeStyles } from '../context/ThemeContext'
import Toast from 'react-native-toast-message'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { syncManager } from '../utils/syncManager'

export default function NotesScreen() {
  const qc = useQueryClient()
  const { colors } = useTheme()
  const styles = useStyles()
  const [draftNotes, setDraftNotes] = useState<any[]>([])

  const loadDrafts = async () => {
    const queue = await syncManager.getQueue()
    const noteDrafts = queue
      .filter((item) => item.type === 'NOTE')
      .map((item) => ({
        id: item.id,
        ...item.payload,
        isOfflineDraft: true,
        updatedAt: new Date().toISOString()
      }))
    setDraftNotes(noteDrafts)
  }

  const { data: serverNotes = [], isLoading } = useQuery({ 
    queryKey: ['notes'], 
    queryFn: async () => {
      try {
        const list = await notesApi.list()
        await AsyncStorage.setItem('cached_notes', JSON.stringify(list))
        return list
      } catch (err: any) {
        const isNetwork = err.message && (
          err.message.toLowerCase().includes('unable to reach') ||
          err.message.toLowerCase().includes('network error')
        )
        if (isNetwork) {
          const cached = await AsyncStorage.getItem('cached_notes')
          if (cached) return JSON.parse(cached)
        }
        throw err
      }
    }
  })

  useEffect(() => {
    loadDrafts()
  }, [serverNotes])

  const allNotes = [...draftNotes, ...serverNotes]

  const createNote = useMutation({
    mutationFn: notesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      setModalOpen(false)
      resetForm()
      Toast.show({ type: 'success', text1: 'Note created! 📝' })
    },
    onError: async (e: any, variables: any) => {
      const isNetwork = e.message && (
        e.message.toLowerCase().includes('unable to reach') ||
        e.message.toLowerCase().includes('network error')
      )
      if (isNetwork) {
        await syncManager.addToQueue('NOTE', 'CREATE', variables)
        setModalOpen(false)
        resetForm()
        await loadDrafts()
        Toast.show({
          type: 'info',
          text1: 'Working offline ⏳',
          text2: 'Note queued as draft; will sync when online.',
        })
      } else {
        Toast.show({ type: 'error', text1: e.message || 'Could not create note' })
      }
    },
  })

  const updateNote = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => notesApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      setModalOpen(false)
      resetForm()
      Toast.show({ type: 'success', text1: 'Note saved!' })
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e.message || 'Could not save note' }),
  })

  const deleteNote = useMutation({
    mutationFn: notesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      setModalOpen(false)
      resetForm()
      Toast.show({ type: 'success', text1: 'Note deleted' })
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e.message || 'Could not delete note' }),
  })

  // State
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState<any | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [pinned, setPinned] = useState(false)
  const [search, setSearch] = useState('')

  const resetForm = () => {
    setSelectedNote(null)
    setTitle('')
    setContent('')
    setPinned(false)
  }

  const handleOpenNew = () => {
    resetForm()
    setModalOpen(true)
  }

  const handleOpenEdit = (note: any) => {
    setSelectedNote(note)
    setTitle(note.title)
    setContent(note.content || '')
    setPinned(note.pinned || false)
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!title.trim()) {
      Toast.show({ type: 'error', text1: 'Title is required' })
      return
    }

    if (selectedNote && selectedNote.isOfflineDraft) {
      Toast.show({ type: 'info', text1: 'Offline Draft', text2: 'Draft notes cannot be modified until synced.' })
      return
    }

    const payload = { title: title.trim(), content: content.trim(), pinned }

    if (selectedNote) {
      updateNote.mutate({ id: selectedNote.id, payload })
    } else {
      createNote.mutate(payload)
    }
  }

  const handleDelete = (id: string) => {
    if (id.startsWith('draft_')) {
      Alert.alert('Delete Draft', 'Remove this offline draft note?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await syncManager.removeFromQueue(id)
            await loadDrafts()
            Toast.show({ type: 'info', text1: 'Draft deleted' })
          },
        },
      ])
      return
    }
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteNote.mutate(id),
      },
    ])
  }

  const togglePin = () => {
    setPinned(p => !p)
  }

  // Filter and sort notes
  const sorted = [...allNotes].sort((a: any, b: any) => {
    if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned)
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  const filtered = sorted.filter(
    (n: any) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      (n.content && n.content.toLowerCase().includes(search.toLowerCase()))
  )

  const formatNoteDate = (isoStr: string) => {
    const d = new Date(isoStr)
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Notes</Text>
            <Text style={styles.subtitle}>{allNotes.length} notes</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleOpenNew}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={colors.ink[400]}
        />
      </View>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator color={colors.brand[500]} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[
                styles.noteCard, 
                item.pinned && styles.pinnedCard,
                item.isOfflineDraft && {
                  borderStyle: 'dashed',
                  borderWidth: 1.5,
                  borderColor: colors.brand[300]
                }
              ]} 
              onPress={() => handleOpenEdit(item)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.noteTitle} numberOfLines={1}>{item.title || 'Untitled Note'}</Text>
                {item.pinned && <Text style={styles.pinIcon}>📌</Text>}
              </View>
              {item.content ? (
                <Text style={styles.noteContent} numberOfLines={3}>{item.content}</Text>
              ) : (
                <Text style={[styles.noteContent, { color: colors.ink[400] }]}>No additional text</Text>
              )}
              <View style={styles.cardFooter}>
                <Text style={styles.noteDate}>{item.isOfflineDraft ? '⏳ Draft' : formatNoteDate(item.updatedAt)}</Text>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.trashBtn}>
                  <Text style={styles.trashText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No notes found. Capture your thoughts!</Text>
          }
        />
      )}

      {/* New / Edit Note Modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modal}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{selectedNote ? 'Edit Note' : 'New Note'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              {/* Pin Switch */}
              <TouchableOpacity onPress={togglePin} style={[styles.modalActionBtn, pinned && styles.modalActionBtnActive]}>
                <Text style={styles.modalActionBtnText}>{pinned ? '📌 Pinned' : 'Pin'}</Text>
              </TouchableOpacity>

              {/* Delete inside edit modal */}
              {selectedNote && (
                <TouchableOpacity onPress={() => handleDelete(selectedNote.id)} style={styles.modalTrashBtn}>
                  <Text style={{ fontSize: 16 }}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Form */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Title..."
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={colors.ink[400]}
            />

            <Text style={styles.label}>Content</Text>
            <TextInput
              style={[styles.input, { height: 260, textAlignVertical: 'top' }]}
              placeholder="Write something down..."
              multiline
              value={content}
              onChangeText={setContent}
              placeholderTextColor={colors.ink[400]}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={createNote.isPending || updateNote.isPending}>
              {createNote.isPending || updateNote.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Save Note</Text>
              )}
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
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backArrow: { fontSize: 22, color: colors.ink[900], paddingRight: 4 },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: colors.ink[900] },
  subtitle: { fontSize: FontSize.xs, color: colors.ink[400], marginTop: 2 },
  addBtn: {
    backgroundColor: colors.brand[500],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.surface.white,
    borderWidth: 1.5,
    borderColor: colors.surface.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.sm,
    color: colors.ink[900],
  },
  listContainer: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  noteCard: {
    backgroundColor: colors.surface.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.surface.border,
    ...Shadow.sm,
  },
  pinnedCard: {
    borderColor: colors.brand[300],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  noteTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: colors.ink[900],
    flex: 1,
  },
  pinIcon: {
    fontSize: 12,
    marginLeft: 6,
  },
  noteContent: {
    fontSize: FontSize.sm,
    color: colors.ink[500],
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
    paddingTop: 8,
  },
  noteDate: {
    fontSize: 10,
    color: colors.ink[300],
  },
  trashBtn: {
    padding: 4,
  },
  trashText: {
    fontSize: FontSize.sm,
    color: colors.status.error,
  },
  empty: {
    textAlign: 'center',
    color: colors.ink[400],
    marginTop: 60,
    fontSize: FontSize.sm,
  },
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
  modalCloseText: {
    fontSize: 18,
    color: colors.ink[500],
    fontWeight: '700',
    marginRight: 6,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: colors.ink[900],
  },
  modalActionBtn: {
    backgroundColor: colors.surface.white,
    borderWidth: 1,
    borderColor: colors.surface.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  modalActionBtnActive: {
    borderColor: colors.brand[200],
    backgroundColor: colors.brand[50],
  },
  modalActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.ink[700],
  },
  modalTrashBtn: {
    padding: 6,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: colors.ink[700],
    marginBottom: 6,
    marginTop: Spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.surface.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: colors.ink[900],
    backgroundColor: colors.surface.white,
    marginBottom: Spacing.sm,
  },
  submitBtn: {
    backgroundColor: colors.brand[500],
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
}))
