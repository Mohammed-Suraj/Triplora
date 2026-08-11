import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Compass, Globe2, Heart, Leaf, Sparkles, Target } from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { SmartImage } from '@/components/ui/SmartImage'
import { Badge } from '@/components/ui/Badge'

const stats = [
  { value: '50K+', label: 'Journeys crafted' },
  { value: '9', label: 'Signature regions' },
  { value: '4.8', label: 'Average rating' },
  { value: '120+', label: 'Local partners' },
]

const values = [
  {
    icon: Sparkles,
    title: 'Effortlessly personal',
    description:
      'Our AI planner reads your pace, budget and taste, then assembles a Kerala itinerary that feels made-to-measure.',
  },
  {
    icon: Leaf,
    title: 'Rooted in responsibility',
    description:
      'We partner with homestays, boatmen and guides who protect the backwaters, forests and communities you visit.',
  },
  {
    icon: Heart,
    title: 'Built on trust',
    description:
      'No hidden costs, no crowds-only tourist traps — just honest recommendations from people who love this land.',
  },
]

export function AboutPage() {
  return (
    <div className="pt-28 pb-20 md:pt-32">
      {/* Story */}
      <section className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col items-start gap-5"
          >
            <Badge variant="accent">
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              Our Story
            </Badge>
            <h1 className="font-serif text-4xl font-bold text-balance text-foreground md:text-5xl">
              We turn Kerala&apos;s magic into journeys you&apos;ll never forget
            </h1>
            <p className="text-base leading-relaxed text-pretty text-muted-foreground">
              Triplora was born from a simple belief: exploring God&apos;s Own Country should feel
              as serene as the backwaters themselves. Frustrated by cookie-cutter tours and endless
              tabs of research, our founders set out to build a smarter, gentler way to travel.
            </p>
            <p className="text-base leading-relaxed text-pretty text-muted-foreground">
              Today, Triplora blends deep local knowledge with AI-crafted itineraries — pairing
              misty tea hills, kettuvallam houseboats and clifftop sunsets into seamless trips
              tailored to how you love to travel.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="relative overflow-hidden rounded-2xl shadow-xl ring-1 ring-border md:rounded-[2rem]"
          >
            <SmartImage
              src="/images/hero-kerala.png"
              alt="Kerala backwaters at golden hour"
              className="aspect-[4/3] h-full w-full"
            />
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto mt-20 max-w-7xl px-4 md:mt-28 md:px-6">
        <div className="grid grid-cols-2 gap-4 rounded-2xl bg-secondary p-6 md:grid-cols-4 md:gap-6 md:rounded-[2rem] md:p-10">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
              className="flex flex-col items-center gap-1 text-center"
            >
              <span className="font-serif text-3xl font-bold text-primary md:text-4xl">
                {stat.value}
              </span>
              <span className="text-sm font-medium text-secondary-foreground">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="mx-auto mt-20 max-w-7xl px-4 md:mt-28 md:px-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[
            {
              icon: Target,
              eyebrow: 'Our Mission',
              title: 'Make thoughtful travel effortless',
              body: 'To hand every traveller a Kerala journey that is personal, sustainable and stress-free — from the first spark of inspiration to the last sunset on the coast.',
            },
            {
              icon: Globe2,
              eyebrow: 'Our Vision',
              title: 'Celebrate Kerala, responsibly',
              body: 'To become the most loved way to experience God\u2019s Own Country, uplifting local communities and protecting the landscapes that make it extraordinary.',
            },
          ].map((card, index) => (
            <motion.article
              key={card.eyebrow}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: index * 0.1, ease: 'easeOut' }}
              className="flex flex-col gap-4 rounded-2xl bg-card p-8 shadow-sm ring-1 ring-border"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <card.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold uppercase tracking-widest text-primary">
                {card.eyebrow}
              </span>
              <h3 className="font-serif text-2xl font-semibold text-card-foreground">
                {card.title}
              </h3>
              <p className="text-base leading-relaxed text-muted-foreground">{card.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto mt-20 max-w-7xl px-4 md:mt-28 md:px-6">
        <SectionHeading
          eyebrow="What guides us"
          title="The principles behind every trip"
          description="Three commitments shape how we design your Kerala experience."
        />
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {values.map((value, index) => (
            <motion.article
              key={value.title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: index * 0.1, ease: 'easeOut' }}
              className="flex flex-col gap-3 rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent-foreground">
                <value.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="font-serif text-xl font-semibold text-card-foreground">
                {value.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{value.description}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto mt-20 max-w-7xl px-4 md:mt-28 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-2xl md:rounded-[2rem]"
        >
          <img
            src="/images/varkala.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative z-10 flex flex-col items-center gap-6 px-6 py-16 text-center md:px-16 md:py-24">
            <h2 className="max-w-2xl font-serif text-3xl font-bold text-balance text-white md:text-4xl">
              Ready to discover your Kerala?
            </h2>
            <p className="max-w-xl text-base leading-relaxed text-pretty text-white/85">
              Let our AI planner build a journey around the moments that matter most to you.
            </p>
            <Link to="/planner">
              <Button size="lg" className="bg-white text-neutral-900 shadow-none hover:bg-white/90">
                Plan my trip
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
