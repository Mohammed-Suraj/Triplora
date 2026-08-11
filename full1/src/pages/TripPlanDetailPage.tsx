import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Bot,
  CalendarDays,
  Check,
  Copy,
  MapPin,
  Pencil,
  Route,
  Send,
  Sparkles,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import { tripPlanApi } from '@/lib/api'
import type { ChatMessage, TripPlan } from '@/lib/api'
import { AiTripPlanView } from '@/components/trips/AiTripPlanView'
import { DownloadPdfButton } from '@/components/trips/DownloadPdfButton'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/utils'
import { useToast } from '@/context/ToastContext'

const budgetLabels: Record<string, string> = { RELAXED: 'Relaxed', PREMIUM: 'Premium', LUXURY: 'Luxury' }
const styleLabels: Record<string, string> = {
  ROMANTIC: 'Romantic',
  FAMILY: 'Family',
  SOLO: 'Solo',
  FRIENDS: 'Friends',
}

const chatSuggestions = [
  'Make it more affordable',
  'Add waterfalls',
  'Replace Day 2',
  'Suggest cheaper hotels',
  'Make it luxury',
  'Add adventures',
]

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function TripPlanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [plan, setPlan] = useState<TripPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingTitle, setEditingTitle] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatSending, setChatSending] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await tripPlanApi.get(id)
      setPlan(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this trip.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
    setMessages([])
    setChatInput('')
  }, [load])

  const handleRename = async (title: string) => {
    if (!plan) return
    setBusy(true)
    try {
      const res = await tripPlanApi.updateTitle(plan.id, title)
      setPlan(res.data)
      setEditingTitle(false)
      toast.success('Title updated.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not rename the trip.')
    } finally {
      setBusy(false)
    }
  }

  const handleDuplicate = async () => {
    if (!plan) return
    setBusy(true)
    try {
      const res = await tripPlanApi.duplicate(plan.id)
      toast.success('Trip duplicated.')
      navigate(`/my-ai-trips/${res.data.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not duplicate the trip.')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!plan) return
    setBusy(true)
    try {
      await tripPlanApi.remove(plan.id)
      toast.success('Trip deleted.')
      navigate('/my-ai-trips')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete the trip.')
      setBusy(false)
    }
  }

  const sendChat = async () => {
    const text = chatInput.trim()
    if (!text || chatSending || !plan) return

    const history = [...messages, { role: 'user' as const, content: text }]
    setMessages(history)
    setChatInput('')
    setChatSending(true)
    try {
      const res = await tripPlanApi.chat(plan.id, { message: text, history: messages })
      setPlan(res.data)
      setMessages([
        ...history,
        { role: 'assistant' as const, content: `Updated "${res.data.title ?? 'your trip'}".` },
      ])
      toast.success('Itinerary updated by the AI assistant.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'The assistant could not update the itinerary.'
      setMessages(messages)
      setChatInput(text)
      toast.error(msg)
    } finally {
      setChatSending(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-28 pb-20 md:px-6 md:pt-32">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-2/3 max-w-xl" />
          <Skeleton className="h-5 w-72" />
          <div className="mt-4 flex flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-4 rounded-2xl bg-card p-4 ring-1 ring-border">
                <Skeleton className="h-24 w-32 rounded-xl" />
                <div className="flex flex-1 flex-col gap-3">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-red-500">{error ?? 'Trip not found.'}</p>
        <Link to="/my-ai-trips">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to My AI Trips
          </Button>
        </Link>
      </div>
    )
  }

  const hasPayload = !!plan.payload && plan.payload.itinerary.length > 0

  return (
    <div className="mx-auto max-w-7xl px-4 pt-28 pb-20 md:px-6 md:pt-32">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <Link
          to="/my-ai-trips"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          My AI Trips
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleDuplicate} disabled={busy}>
            <Copy className="h-4 w-4" aria-hidden="true" />
            Duplicate
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
            className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease: 'easeOut' }}
        className="mt-6 flex flex-col gap-4"
      >
        <div>
          {editingTitle ? (
            <form
              className="flex max-w-2xl items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                const input = (e.currentTarget.elements.namedItem('title') as HTMLInputElement).value.trim()
                if (input) handleRename(input)
              }}
            >
              <input
                name="title"
                defaultValue={plan.title ?? 'Untitled trip'}
                autoFocus
                maxLength={120}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 font-serif text-2xl font-bold text-card-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
              <button
                type="submit"
                disabled={busy}
                aria-label="Save title"
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-primary text-primary-foreground"
              >
                <Check className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setEditingTitle(false)}
                aria-label="Cancel rename"
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-secondary text-secondary-foreground"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="max-w-2xl font-serif text-3xl font-bold text-balance text-foreground md:text-4xl">
                {plan.title ?? 'Untitled trip'}
              </h1>
              <Button size="sm" variant="outline" onClick={() => setEditingTitle(true)} aria-label="Rename trip">
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Rename
              </Button>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {formatDate(plan.createdAt) && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {formatDate(plan.createdAt)}
              </span>
            )}
            <Badge>
              <Route className="h-3 w-3" aria-hidden="true" />
              {plan.days} days
            </Badge>
            <Badge>
              <Wallet className="h-3 w-3" aria-hidden="true" />
              {budgetLabels[plan.budget] ?? plan.budget}
            </Badge>
            <Badge>{styleLabels[plan.travelStyle] ?? plan.travelStyle}</Badge>
          </div>
        </div>

        {hasPayload ? (
          <AiTripPlanView
            plan={plan.payload!}
            actions={<DownloadPdfButton plan={plan.payload!} meta={{ title: plan.title, createdAt: plan.createdAt }} label="Download PDF" />}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {plan.itinerary.map((item) => (
              <div
                key={item.day}
                className="flex gap-4 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border"
              >
                <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl">
                  <SmartImage
                    src={item.destination.image}
                    alt={item.destination.name}
                    className="h-full w-full"
                  />
                  <span className="glass absolute top-1.5 left-1.5 flex h-6 items-center rounded-full px-2.5 text-xs font-bold text-white">
                    Day {item.day}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-card-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    {item.destination.name}
                  </span>
                  <p className="text-sm text-muted-foreground">{item.focus}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI Chat Assistant */}
        {hasPayload && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
            className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border"
            aria-label="AI travel assistant"
          >
            <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-card-foreground">
              <Bot className="h-5 w-5 text-primary" aria-hidden="true" />
              Travel assistant
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask the assistant to tweak this exact itinerary - cheaper hotels, more beaches, bigger budget,
              a new destination for a day...
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {chatSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setChatInput(suggestion)}
                  className="cursor-pointer rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/70"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div className="mt-4 flex max-h-72 flex-col gap-2 overflow-y-auto">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'self-end rounded-br-sm bg-primary text-primary-foreground'
                      : 'self-start rounded-bl-sm bg-secondary text-secondary-foreground',
                  )}
                >
                  {msg.content}
                </div>
              ))}
              {chatSending && (
                <div className="flex items-center gap-2 self-start rounded-2xl rounded-bl-sm bg-secondary px-4 py-2.5">
                  <Sparkles className="h-4 w-4 animate-pulse text-primary" aria-hidden="true" />
                  <span className="text-sm text-secondary-foreground">Updating your itinerary...</span>
                </div>
              )}
            </div>

            <form
              className="mt-4 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                sendChat()
              }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatSending}
                maxLength={2000}
                placeholder={messages.length === 0 ? 'e.g. Replace Day 3 with Kochi' : 'Ask the assistant for the next change...'}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
              <Button type="submit" disabled={chatSending || !chatInput.trim()} aria-label="Send message">
                <Send className="h-4 w-4" aria-hidden="true" />
                Send
              </Button>
            </form>
          </motion.section>
        )}
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setConfirmDelete(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              role="dialog"
              aria-modal="true"
              aria-label="Delete itinerary confirmation"
              className="relative z-10 w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border"
            >
              <h3 className="font-serif text-xl font-bold text-card-foreground">Delete itinerary?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-foreground">{plan.title ?? 'this trip'}</span>? This
                cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                  Keep trip
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={handleDelete}
                  className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                >
                  {busy ? 'Deleting...' : 'Confirm Delete'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}