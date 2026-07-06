import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Linking
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '../constants/theme'
import { router } from 'expo-router'
import { documentsApi } from '../api/features'
import Toast from 'react-native-toast-message'

function fileEmoji(fileType: string): string {
  if (!fileType) return '📄'
  if (fileType.includes('pdf')) return '📕'
  if (fileType.includes('image') || fileType.includes('jpeg') || fileType.includes('png')) return '🖼️'
  if (fileType.includes('word') || fileType.includes('docx')) return '📝'
  if (fileType.includes('sheet') || fileType.includes('xlsx') || fileType.includes('csv')) return '📊'
  if (fileType.includes('zip') || fileType.includes('rar')) return '🗜️'
  return '📄'
}

function formatBytes(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentsScreen() {
  const qc = useQueryClient()
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: documentsApi.list,
  })

  const deleteDoc = useMutation({
    mutationFn: (id: string) => documentsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      Toast.show({ type: 'success', text1: 'Document deleted' })
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e.message || 'Could not delete' }),
  })

  const handleDownload = (doc: any) => {
    const url = documentsApi.downloadUrl(doc.id)
    Alert.alert(
      'Open Document',
      `Open "${doc.fileName}" in your browser?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open', onPress: () => Linking.openURL(url) },
      ]
    )
  }

  const handleDelete = (doc: any) => {
    Alert.alert('Delete Document', `Delete "${doc.fileName}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDoc.mutate(doc.id) },
    ])
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Document Vault</Text>
        </View>
        <Text style={styles.count}>{(documents as any[]).length} file{(documents as any[]).length !== 1 ? 's' : ''}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.brand[500]} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={documents as any[]}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ padding: Spacing.lg }}
          renderItem={({ item }) => (
            <View style={styles.docCard}>
              <View style={styles.docLeft}>
                <View style={styles.iconBlock}>
                  <Text style={{ fontSize: 20 }}>{fileEmoji(item.fileType)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName} numberOfLines={1}>{item.fileName}</Text>
                  <Text style={styles.docMeta}>
                    {formatBytes(item.fileSize)} • {item.scanned ? '✅ Scanned' : '📄 Document'}
                  </Text>
                  <Text style={styles.docDate}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDownload(item)}>
                  <Text style={styles.actionText}>⬇️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item)}>
                  <Text style={styles.actionText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📂</Text>
              <Text style={styles.emptyTitle}>No documents yet</Text>
              <Text style={styles.emptyDesc}>Upload documents from the web app to see them here.</Text>
            </View>
          }
        />
      )}
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
  count: { fontSize: FontSize.sm, color: Colors.ink[500], fontWeight: '600' },
  docCard: {
    backgroundColor: Colors.surface.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadow.sm,
  },
  docLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  iconBlock: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.ink[900] },
  docMeta: { fontSize: FontSize.xs, color: Colors.ink[500], marginTop: 2 },
  docDate: { fontSize: FontSize.xs, color: Colors.ink[400], marginTop: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: { backgroundColor: '#fff1f2' },
  actionText: { fontSize: 16 },
  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: Spacing.xl },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.ink[900], marginBottom: Spacing.sm },
  emptyDesc: { fontSize: FontSize.sm, color: Colors.ink[500], textAlign: 'center', lineHeight: 22 },
})
