import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Bot,
  MessageSquarePlus,
  MapPin,
  Plus,
  Send,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react'
import {
  assistantApi,
  type AssistantConversationSummary,
  type AssistantMessageDto,
} from '@/lib/api'
import type { Destination } from '@/data/destinations'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/utils'

const suggestions = [
  'Best time to visit Munnar',
  'Cheapest beach destination',
  'Where can I see elephants?',
  'Romantic spots in Alleppey',
  'What to pack for monsoon',
  'Food I must try in Kerala',
]

interface ChatEntry {
  role: 'USER' | 'ASSISTANT'
  content: string
  destinations: Destination[]
}

function timeAgo(value: string): string {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function formatMessage(content: string): string[] {
  return content.split('\n').filter((line) => line.trim().length > 0)
}

export function AiAssistantPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [conversations, setConversations] = useState<AssistantConversationSummary[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadConversations = async () => {
    try {
      const res = await assistantApi.conversations()
      setConversations(res.data)
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    void loadConversations()
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  const openConversation = async (id: string) => {
    setActiveId(id)
    setLoadingConversation(true)
    try {
      const res = await assistantApi.get(id)
      setMessages(
        res.data.messages.map((msg: AssistantMessageDto) => ({
          role: msg.role,
          content: msg.content,
          destinations: [],
        })),
      )
    } catch {
      toast.error('Could not load this conversation.')
      setMessages([])
    } finally {
      setLoadingConversation(false)
    }
  }

  const startNew = () => {
    setActiveId(null)
    setMessages([])
    setInput('')
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await assistantApi.remove(id)
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (activeId === id) startNew()
      toast.success('Conversation deleted.')
    } catch {
      toast.error('Could not delete this conversation.')
    } finally {
      setDeletingId(null)
    }
  }

  const send = async (e?: FormEvent) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || sending) return

    const userEntry: ChatEntry = { role: 'USER', content: text, destinations: [] }
    setMessages((prev) => [...prev, userEntry])
    setInput('')
    setSending(true)
    try {
      const res = await assistantApi.chat(text, activeId)
      setMessages((prev) => [
        ...prev,
        { role: 'ASSISTANT', content: res.data.reply, destinations: res.data.destinations ?? [] },
      ])
      if (!activeId) {
        setActiveId(res.data.conversationId)
        void loadConversations()
      }
    } catch (err) {
      setMessages((prev) => prev.slice(0, -1))
      setInput(text)
      toast.error(err instanceof Error ? err.message : 'The assistant is unavailable right now.')
    } finally {
      setSending(false)
    }
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="font-serif text-2xl font-bold text-foreground">Triplora AI Assistant</h1>
        <p className="text-sm text-muted-foreground">
          Log in to chat with your personal Kerala travel expert.
        </p>
        <Link to="/login">
          <Button>Log in to get started</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pt-24 pb-8 md:px-6 md:pt-28">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Conversation history */}
        <aside className="lg:w-72 lg:shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="flex items-center gap-2 font-serif text-xl font-bold text-foreground">
              <Bot className="h-5 w-5 text-primary" aria-hidden="true" />
              AI Assistant
            </h1>
            <Button size="sm" onClick={startNew} className="lg:hidden">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New
            </Button>
          </div>
          <p className="mt-1 hidden text-sm text-muted-foreground lg:block">
            Your personal Kerala travel expert.
          </p>

          <Button
            variant="outline"
            className="mt-4 hidden w-full lg:flex"
            onClick={startNew}
            disabled={activeId === null && messages.length === 0}
          >
            <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
            New conversation
          </Button>

          <div className="mt-4 hidden flex-col gap-1 lg:flex">
            {loadingHistory ? (
              <div className="flex flex-col gap-2 px-2 py-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col gap-1.5 px-3 py-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="px-2 py-4 text-sm text-muted-foreground">
                No conversations yet. Ask anything about Kerala!
              </p>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    'group flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 transition-colors',
                    activeId === conversation.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                  onClick={() => void openConversation(conversation.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{conversation.title}</p>
                    <p className="text-xs text-muted-foreground/80">
                      {timeAgo(conversation.updatedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleDelete(conversation.id)
                    }}
                    disabled={deletingId === conversation.id}
                    aria-label={`Delete ${conversation.title}`}
                    className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Chat panel */}
        <section className="flex min-h-[70vh] flex-1 flex-col overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-border">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-sm font-semibold text-foreground">Travel Assistant</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              · Triplora's destination database + AI
            </span>
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Free to use
            </span>
          </div>

          <div ref={scrollRef} className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-6 md:px-6">
            {loadingConversation ? (
              <div className="flex items-center gap-2 px-2 py-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-40" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 py-10 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Bot className="h-8 w-8" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-serif text-xl font-semibold text-foreground">
                    Ask me anything about Kerala
                  </h2>
                  <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                    I answer from Triplora's database of {`74`} destinations — beaches, backwaters, hill
                    stations, festivals, food and more.
                  </p>
                </div>
                <div className="flex max-w-md flex-wrap justify-center gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setInput(suggestion)
                        void send()
                      }}
                      className="press cursor-pointer rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/70"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((entry, index) => (
                <div key={index} className={cn('flex flex-col', entry.role === 'USER' ? 'items-end' : 'items-start')}>
                  <div
                    className={cn(
                      'max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap md:max-w-[80%]',
                      entry.role === 'USER'
                        ? 'rounded-br-md bg-primary text-primary-foreground'
                        : 'rounded-bl-md bg-secondary text-secondary-foreground',
                    )}
                  >
                    {entry.role === 'ASSISTANT' ? (
                      <div className="flex flex-col gap-1.5">
                        {formatMessage(entry.content).map((line, i) => (
                          <p key={i} className={cn(line.startsWith('• ') && 'pl-2')}>
                            {line}
                          </p>
                        ))}
                      </div>
                    ) : (
                      entry.content
                    )}
                  </div>

                  {entry.destinations.length > 0 && (
                    <div className="mt-2 flex w-full max-w-[92%] flex-wrap gap-2 md:max-w-[80%]">
                      {entry.destinations.map((destination) => (
                        <Link
                          key={destination.id}
                          to={`/destinations/${destination.id}`}
                          className="flex items-center gap-2 rounded-xl bg-background p-2 pr-3 text-sm ring-1 ring-border transition-colors hover:ring-primary/50"
                        >
                          <SmartImage
                            src={destination.image}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-lg"
                          />
                          <span className="flex flex-col">
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <MapPin className="h-3 w-3 text-primary" aria-hidden="true" />
                              {destination.name}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Star className="h-3 w-3 fill-accent text-accent" aria-hidden="true" />
                              {destination.rating} · from ₹{destination.priceFrom.toLocaleString('en-IN')}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}

            {sending && (
              <div className="flex items-center gap-3 self-start rounded-2xl rounded-bl-md bg-secondary px-4 py-3">
                <span className="flex gap-1" aria-label="Assistant is typing">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
                      style={{ animationDelay: `${dot * 0.15}s` }}
                    />
                  ))}
                </span>
                <span className="text-sm text-secondary-foreground">Thinking...</span>
              </div>
            )}
          </div>

          <form onSubmit={send} className="border-t border-border p-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={sending}
                maxLength={2000}
                placeholder="Ask about destinations, seasons, food, budgets..."
                aria-label="Ask the AI assistant"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
              <Button type="submit" disabled={sending || !input.trim()} aria-label="Send message">
                <Send className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Send</span>
              </Button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Answers use Triplora's destination database and may include links to booking pages.
            </p>
          </form>
        </section>
      </div>
    </div>
  )
}
