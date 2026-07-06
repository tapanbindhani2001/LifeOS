import { useEffect, useRef, useState } from 'react'
import { Plus, Send, Sparkles, Trash2, MessageSquare, Lock, Zap, Crown } from 'lucide-react'
import { format } from 'date-fns'
import clsx from 'clsx'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Skeleton } from '@/components/ui/Overlay'
import { useSubscription } from '@/hooks/useSubscription'
import {
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useMessages,
  useSendMessage,
} from '@/hooks/usePlatform'

function PremiumGate() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-16">
      <div className="w-full max-w-md">
        {/* Glowing icon */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-brand-500 opacity-20 blur-xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-lg">
              <Crown className="h-10 w-10 text-white" />
            </div>
          </div>
        </div>

        {/* Headline */}
        <h2 className="mb-2 text-center font-display text-2xl font-bold text-ink-900">
          AI Assistant is Premium
        </h2>
        <p className="mb-8 text-center text-sm leading-relaxed text-ink-500">
          Upgrade to Monthly or Annual plan to unlock your personal AI planner — powered by Groq AI with full context of your tasks, habits, goals, and expenses.
        </p>

        {/* Feature bullets */}
        <ul className="mb-8 space-y-3 rounded-2xl bg-surface-soft p-5">
          {[
            { icon: '🧠', text: 'Personalized responses based on YOUR data' },
            { icon: '✅', text: 'Smart task & habit planning suggestions' },
            { icon: '💰', text: 'Spending analysis & budget coaching' },
            { icon: '🎯', text: 'Goal milestone tracking support' },
            { icon: '⚡', text: 'Ultra-fast Groq AI inference' },
          ].map((f) => (
            <li key={f.text} className="flex items-center gap-3 text-sm text-ink-700">
              <span className="text-base">{f.icon}</span>
              {f.text}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={() => navigate('/subscriptions')}
          className="btn-primary w-full gap-2 py-3 text-base"
        >
          <Zap className="h-5 w-5" />
          Upgrade to Premium
        </button>
        <p className="mt-3 text-center text-xs text-ink-400">
          Cancel anytime · Instant activation
        </p>
      </div>
    </div>
  )
}

export default function AIAssistantPage() {
  const { data: subscription, isLoading: subLoading } = useSubscription()
  const { data: conversations = [], isLoading: convLoading } = useConversations()
  const createConversation = useCreateConversation()
  const deleteConversation = useDeleteConversation()
  const [activeId, setActiveId] = useState<string | null>(null)

  const isPremium =
    subscription?.plan !== 'FREE' && subscription?.status === 'ACTIVE'

  useEffect(() => {
    if (!activeId && conversations.length > 0) setActiveId(conversations[0].id)
  }, [conversations, activeId])

  useEffect(() => {
    if (!isPremium) return
    if (!convLoading && conversations.length === 0 && !createConversation.isPending) {
      createConversation.mutate(undefined, {
        onSuccess: (conv) => setActiveId(conv.id),
      })
    }
  }, [conversations, convLoading, isPremium])

  const { data: messages = [], isLoading: msgLoading } = useMessages(activeId)
  const sendMessage = useSendMessage(activeId)
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const promptParam = params.get('prompt')
    if (promptParam) {
      setDraft(promptParam)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleNewConversation = () => {
    createConversation.mutate(undefined, {
      onSuccess: (conv) => setActiveId(conv.id),
    })
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim() || !activeId) return
    sendMessage.mutate(draft.trim())
    setDraft('')
  }

  // Show loading skeleton while checking subscription
  if (subLoading) {
    return (
      <AppLayout title="AI Assistant" subtitle="Your personal planner, powered by AI.">
        <Skeleton className="h-[calc(100vh-160px)]" />
      </AppLayout>
    )
  }

  // Show premium gate for free-tier users
  if (!isPremium) {
    return (
      <AppLayout title="AI Assistant" subtitle="Your personal planner, powered by AI.">
        <div className="card flex h-[calc(100vh-160px)] overflow-hidden">
          <PremiumGate />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="AI Assistant" subtitle="Your personal planner, powered by AI.">
      <div className="grid h-[calc(100vh-160px)] grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* Conversation list */}
        <div className="card flex flex-col overflow-hidden">
          <div className="border-b border-surface-border p-4">
            <button onClick={handleNewConversation} className="btn-primary w-full !text-sm">
              <Plus className="h-4 w-4" /> New Chat
            </button>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {convLoading && <Skeleton className="h-40" />}
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveId(conv.id)}
                className={clsx(
                  'group flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                  activeId === conv.id ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-surface-muted',
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate font-medium">{conv.title || 'New conversation'}</span>
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteConversation.mutate(conv.id)
                    if (activeId === conv.id) setActiveId(null)
                  }}
                  className="rounded-md p-1 text-ink-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
              </button>
            ))}
            {!convLoading && conversations.length === 0 && (
              <p className="p-4 text-center text-sm text-ink-500">No conversations yet.</p>
            )}
          </div>
        </div>

        {/* Chat thread */}
        <div className="card flex flex-col overflow-hidden">
          {!activeId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="font-display text-base font-semibold text-ink-900">Start a new conversation</h3>
              <p className="max-w-xs text-sm text-ink-500">
                Ask your AI assistant to plan your day, summarize notes, or review your spending.
              </p>
              <button onClick={handleNewConversation} className="btn-primary">
                <Plus className="h-4 w-4" /> New Chat
              </button>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-6">
                {msgLoading && <Skeleton className="h-40" />}
                {messages.map((m) => (
                  <div key={m.id} className={clsx('flex', m.role === 'USER' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={clsx(
                        'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
                        m.role === 'USER' ? 'bg-brand-500 text-white' : 'bg-surface-soft text-ink-900',
                      )}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      <p className={clsx('mt-1 text-[10px]', m.role === 'USER' ? 'text-brand-100' : 'text-ink-300')}>
                        {format(new Date(m.createdAt), 'hh:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && !msgLoading && (
                  <p className="pt-10 text-center text-sm text-ink-500">Say hello to get started.</p>
                )}
              </div>

              <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-surface-border p-4">
                <input
                  className="input"
                  placeholder="Ask me anything..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={sendMessage.isPending || !draft.trim()}
                  className="btn-primary !px-3.5"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
