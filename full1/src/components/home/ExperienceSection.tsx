import { motion } from 'framer-motion'
import { Compass, HeartHandshake, Leaf, ShieldCheck } from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'

const features = [
  {
    icon: Compass,
    title: 'Local Expertise',
    description:
      'Every itinerary is crafted by travel designers born and raised in Kerala who know its hidden corners.',
  },
  {
    icon: Leaf,
    title: 'Responsible Travel',
    description:
      'We partner with eco-certified stays and community-run experiences that give back to local villages.',
  },
  {
    icon: ShieldCheck,
    title: 'Fully Verified',
    description:
      'Hand-inspected homestays, licensed guides and 24/7 on-trip support so you can travel with confidence.',
  },
  {
    icon: HeartHandshake,
    title: 'Tailored to You',
    description:
      'From slow backwater cruises to high-altitude treks — every journey is shaped around your pace and taste.',
  },
]

export function ExperienceSection() {
  return (
    <section className="bg-secondary/50 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeading
          eyebrow="Why Triplora"
          title="Travel that feels effortless"
          description="We obsess over every detail so that your only job is to be present in the moment."
        />
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
              className="flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <feature.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="font-serif text-lg font-semibold text-card-foreground">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
