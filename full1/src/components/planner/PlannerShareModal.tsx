import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Link2, Loader2, Share2, X } from 'lucide-react'
import type { PlannerTrip } from '@/lib/api'
import { plannerApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/context/ToastContext'

interface PlannerShareModalProps {
  open: boolean
  trip: PlannerTrip
  onClose: () => void
  onShared: (trip: PlannerTrip) => void
}

export function PlannerShareModal({ open, trip, onClose, onShared }: PlannerShareModalProps) {
  const toast = useToast()
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareUrl = trip.shareCode
    ? `${window.location.origin}/planner/share/${trip.shareCode}`
    : null

  const generate = async () => {
    setGenerating(true)
    try {
      const res = await plannerApi.generateShareCode(trip.id)
      onShared(res.data)
      toast.success('Share link ready')
    } catch {
      toast.error('Could not create a share link')
    } finally {
      setGenerating(false)
    }
  }

  const copy = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success('Link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy the link')
    }
  }

  const nativeShare = async () => {
    if (!shareUrl) return
    if (navigator.share) {
      try {
        await navigator.share({ title: trip.title, text: `Check out my ${trip.days.length}-day Kerala itinerary on Triplora!`, url: shareUrl })
      } catch {
        // user dismissed the sheet
      }
      return
    }
    void copy()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl ring-1 ring-border"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label="Share trip"
        >
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h2 className="font-serif text-xl font-semibold text-card-foreground">Share this trip</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Anyone with the link can view <span className="font-semibold text-foreground">{trip.title}</span> — no login needed.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {!shareUrl ? (
            <div className="flex flex-col gap-3">
              <p className="rounded-xl bg-secondary/50 px-4 py-3 text-sm text-secondary-foreground">
                Sharing is off for this trip. Turn it on to generate a public link.
              </p>
              <Button variant="primary" size="lg" onClick={generate} disabled={generating} className="w-full">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
                {generating ? 'Creating link…' : 'Create share link'}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-xl bg-secondary/50 p-2 pl-4 ring-1 ring-border/60">
                <span className="min-w-0 flex-1 truncate text-sm text-secondary-foreground">{shareUrl}</span>
                <Button variant="outline" size="sm" onClick={copy}>
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <Button variant="primary" size="lg" onClick={nativeShare} className="w-full">
                <Share2 className="h-4 w-4" aria-hidden="true" />
                Share via… 
              </Button>
            </div>
          )}
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}