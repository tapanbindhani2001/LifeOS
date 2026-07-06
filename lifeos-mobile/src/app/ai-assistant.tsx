import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aiApi, subscriptionsApi } from '../api/features'
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '../constants/theme'
import Toast from 'react-native-toast-message'
import { router, useLocalSearchParams } from 'expo-router'

function PremiumGate() {
  return (
    <ScrollView contentContainerStyle={gate.container} showsVerticalScrollIndicator={false}>
      <View style={gate.iconWrap}>
        <Text style={gate.icon}>👑</Text>
      </View>
      <Text style={gate.title}>AI Copilot is Premium</Text>
      <Text style={gate.subtitle}>
        Upgrade to a paid plan to unlock your personal AI — powered by Groq with full context of your tasks, habits, goals & spending.
      </Text>
      <View style={gate.featureBox}>
        {[
          ['🧠', 'Personalized AI responses from YOUR data'],
          ['✅', 'Smart task & habit planning suggestions'],
          ['💰', 'Spending analysis & budget coaching'],
          ['🎯', 'Goal milestone tracking support'],
          ['⚡', 'Ultra-fast Groq AI inference'],
        ].map(([emoji, label]) => (
          <View key={label} style={gate.featureRow}>
            <Text style={gate.featureEmoji}>{emoji}</Text>
            <Text style={gate.featureText}>{label}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={gate.cta} onPress={() => router.push('/subscriptions')}>
        <Text style={gate.ctaText}>⚡  Upgrade to Premium</Text>
      </TouchableOpacity>
      <Text style={gate.ctaNote}>Cancel anytime · Instant activation</Text>
    </ScrollView>
  )
}

export default function AIAssistantScreen() {
  const { prompt } = useLocalSearchParams<{ prompt?: string }>()
  const qc = useQueryClient()

  // ── State ──────────────────────────────────────────────────────────────────
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  // ── Subscription check ────────────────────────────────────────────────────
  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionsApi.me,
  })

  const isPremium =
    (subscription as any)?.plan !== 'FREE' && (subscription as any)?.status === 'ACTIVE'

  // ── Conversations ─────────────────────────────────────────────────────────
  const { data: conversations = [], isLoading: convsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: aiApi.listConversations,
    enabled: isPremium,
  })

  // ── Mutations (declared BEFORE effects that reference them) ───────────────
  const createConv = useMutation({
    mutationFn: aiApi.createConversation,
    onSuccess: (newConv: any) => {
      qc.invalidateQueries({ queryKey: ['conversations'] })
      setActiveId(newConv.id)
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e.message }),
  })

  const sendMessage = useMutation({
    mutationFn: (text: string) => aiApi.sendMessage(activeId!, { role: 'USER', content: text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', activeId] })
      setDraft('')
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e.message }),
  })

  // ── Messages ──────────────────────────────────────────────────────────────
  const { data: messages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ['messages', activeId],
    queryFn: () => aiApi.messages(activeId!),
    enabled: !!activeId,
  })

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (prompt) {
      setDraft(prompt)
      router.setParams({ prompt: undefined })
    }
  }, [prompt])

  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].id)
    }
  }, [conversations, activeId])

  // Auto-create a conversation for premium users who have none yet
  useEffect(() => {
    if (!isPremium || subLoading || convsLoading) return
    if (conversations.length === 0 && !createConv.isPending) {
      createConv.mutate('New Chat')
    }
  }, [conversations.length, convsLoading, isPremium, subLoading])

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSend = () => {
    if (!draft.trim() || !activeId) return
    sendMessage.mutate(draft)
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (subLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.brand[500]} style={{ flex: 1 }} />
      </SafeAreaView>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>AI Copilot</Text>
          {isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>PRO</Text>
            </View>
          )}
        </View>
        {isPremium && (
          <TouchableOpacity
            style={styles.newChatBtn}
            onPress={() => createConv.mutate('New Chat')}
            disabled={createConv.isPending}
          >
            <Text style={styles.newChatText}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Premium gate or chat UI */}
      {!isPremium ? (
        <PremiumGate />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={80}
        >
          {msgsLoading ? (
            <ActivityIndicator color={Colors.brand[500]} style={{ flex: 1 }} />
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(item: any) => item.id}
              contentContainerStyle={styles.chatList}
              renderItem={({ item }: { item: any }) => (
                <View style={[styles.bubble, item.role?.toUpperCase() === 'USER' ? styles.bubbleUser : styles.bubbleAi]}>
                  <Text style={[styles.bubbleText, item.role?.toUpperCase() === 'USER' ? styles.textUser : styles.textAi]}>
                    {item.content}
                  </Text>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={{ fontSize: 32, marginBottom: Spacing.sm }}>🤖</Text>
                  <Text style={styles.emptyTitle}>Ask me anything</Text>
                  <Text style={styles.emptyDesc}>How can I help you organize your day?</Text>
                </View>
              }
            />
          )}

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder={createConv.isPending ? 'Creating chat session...' : 'Type a message...'}
              placeholderTextColor={Colors.ink[300]}
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              editable={!createConv.isPending && !!activeId}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!draft.trim() || !activeId) && { opacity: 0.5 }]}
              onPress={handleSend}
              disabled={sendMessage.isPending || !activeId}
            >
              {sendMessage.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 16 }}>➔</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface.soft },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, paddingBottom: Spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backArrow: { fontSize: 22, color: Colors.ink[900], paddingRight: 4 },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.ink[900] },
  premiumBadge: { backgroundColor: Colors.brand[500], paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  premiumBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  newChatBtn: { backgroundColor: Colors.brand[500], paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.sm },
  newChatText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },
  chatList: { padding: Spacing.lg, gap: Spacing.sm },
  bubble: { padding: Spacing.md, borderRadius: BorderRadius.lg, maxWidth: '80%', ...Shadow.sm },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: Colors.brand[500] },
  bubbleAi: { alignSelf: 'flex-start', backgroundColor: Colors.surface.white },
  bubbleText: { fontSize: FontSize.md, lineHeight: 20 },
  textUser: { color: '#fff' },
  textAi: { color: Colors.ink[900] },
  empty: { alignItems: 'center', marginVertical: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.ink[900], marginBottom: 4 },
  emptyDesc: { fontSize: FontSize.sm, color: Colors.ink[400], textAlign: 'center' },
  inputBar: { flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm, backgroundColor: Colors.surface.white, borderTopWidth: 1, borderTopColor: Colors.surface.border },
  input: { flex: 1, borderWidth: 1.5, borderColor: Colors.ink[200], borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 44, color: Colors.ink[900], backgroundColor: Colors.surface.soft },
  sendBtn: { backgroundColor: Colors.brand[500], width: 44, height: 44, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
})

const gate = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, paddingTop: Spacing.lg },
  iconWrap: { width: 80, height: 80, borderRadius: 22, backgroundColor: Colors.brand[500], alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg, ...Shadow.md },
  icon: { fontSize: 38 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.ink[900], textAlign: 'center', marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.sm, color: Colors.ink[500], textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xl },
  featureBox: { width: '100%', backgroundColor: Colors.surface.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.xl, ...Shadow.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  featureEmoji: { fontSize: 18, width: 28 },
  featureText: { fontSize: FontSize.sm, color: Colors.ink[700], flex: 1 },
  cta: { width: '100%', backgroundColor: Colors.brand[500], borderRadius: BorderRadius.lg, paddingVertical: 15, alignItems: 'center', marginBottom: Spacing.sm, ...Shadow.md },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },
  ctaNote: { fontSize: FontSize.xs, color: Colors.ink[400] },
})
