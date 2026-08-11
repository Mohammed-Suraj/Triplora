import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function PlannerCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-2xl md:rounded-[2rem]"
      >
        <img
          src="/images/munnar.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 flex flex-col items-center gap-6 px-6 py-16 text-center md:px-16 md:py-24">
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            AI Trip Planner
          </span>
          <h2 className="max-w-2xl font-serif text-3xl font-bold text-balance text-white md:text-5xl">
            Your perfect Kerala itinerary, crafted in seconds
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-pretty text-white/85">
            Tell us your travel style, budget and dates — our planner assembles a day-by-day
            journey tailored precisely to you.
          </p>
          <Link to="/planner">
            <Button size="lg" className="bg-white text-neutral-900 shadow-none hover:bg-white/90">
              Start Planning
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </motion.div>
    </section>
  )
}
