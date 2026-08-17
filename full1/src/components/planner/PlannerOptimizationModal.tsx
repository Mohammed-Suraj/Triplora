import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Check, X, ShieldCheck } from 'lucide-react'
import type { PlannerTripDay } from '@/lib/api'
import { Button } from '@/components/ui/Button'

interface PlannerOptimizationModalProps {
  isOpen: boolean
  isDeepAi: boolean
  originalDays: PlannerTripDay[]
  optimizedDays: PlannerTripDay[]
  insights: string[]
  onAccept: () => void
  onReject: () => void
}

export function PlannerOptimizationModal({
  isOpen,
  isDeepAi,
  originalDays,
  optimizedDays,
  insights,
  onAccept,
  onReject,
}: PlannerOptimizationModalProps) {
  if (!isOpen) return null

  const origStops = originalDays.reduce((acc, d) => acc + d.items.length, 0)
  const optStops = optimizedDays.reduce((acc, d) => acc + d.items.length, 0)

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-card shadow-2xl ring-1 ring-border"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  {isDeepAi ? 'Deep AI Optimization Preview' : 'Instant Smart Optimization Preview'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Review proposed flow changes. Your original itinerary remains untouched until you accept.
                </p>
              </div>
            </div>
            <button
              onClick={onReject}
              className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Insights Section */}
            {insights.length > 0 && (
              <div className="mb-6 rounded-2xl bg-emerald-500/10 p-4 ring-1 ring-emerald-500/20">
                <div className="mb-2 flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Key Optimization Rationale & Improvements</span>
                </div>
                <ul className="grid grid-cols-1 gap-2 text-xs text-emerald-700 dark:text-emerald-400 sm:grid-cols-2">
                  {insights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Original */}
              <div className="flex flex-col rounded-2xl border border-border/80 bg-background/50 p-4">
                <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Original Flow ({origStops} stops)
                  </span>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Current
                  </span>
                </div>
                <div className="space-y-4 overflow-y-auto text-xs">
                  {originalDays.map((day, dIdx) => (
                    <div key={day.id} className="rounded-xl bg-card p-3 ring-1 ring-border/40">
                      <span className="font-semibold text-foreground">Day {dIdx + 1}: {day.title}</span>
                      <div className="mt-2 space-y-1.5">
                        {day.items.map((item, iIdx) => (
                          <div key={item.id} className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-mono text-[10px] text-muted-foreground">{iIdx + 1}.</span>
                            <span className="truncate font-medium text-foreground">{item.name}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground">{item.city}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Proposed Optimized */}
              <div className="flex flex-col rounded-2xl border border-primary/30 bg-primary/5 p-4 ring-1 ring-primary/20">
                <div className="mb-3 flex items-center justify-between border-b border-primary/20 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Optimized Flow ({optStops} stops)
                  </span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                    Proposed
                  </span>
                </div>
                <div className="space-y-4 overflow-y-auto text-xs">
                  {optimizedDays.map((day, dIdx) => (
                    <div key={day.id} className="rounded-xl bg-card p-3 ring-1 ring-primary/20 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">Day {dIdx + 1}: {day.title}</span>
                      </div>
                      {day.notes && (
                        <p className="mt-1 text-[11px] italic text-muted-foreground">💡 {day.notes}</p>
                      )}
                      <div className="mt-2 space-y-1.5">
                        {day.items.map((item, iIdx) => (
                          <div key={item.id} className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-mono text-[10px] font-semibold text-primary">{iIdx + 1}.</span>
                            <span className="truncate font-medium text-foreground">{item.name}</span>
                            <span className="ml-auto rounded-md bg-secondary/80 px-1.5 py-0.5 text-[10px]">
                              {item.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/40 px-6 py-4">
            <Button variant="outline" size="sm" onClick={onReject}>
              <X className="mr-1.5 h-4 w-4" />
              Keep Original Itinerary
            </Button>
            <Button size="sm" onClick={onAccept} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Check className="mr-1.5 h-4 w-4" />
              Accept & Apply Optimization
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
