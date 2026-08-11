import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'

const testimonials = [
  {
    name: 'Ananya Sharma',
    location: 'Mumbai',
    quote:
      'The houseboat night in Alleppey was pure magic. Triplora handled every detail — we just floated and watched the world go by.',
    rating: 5,
  },
  {
    name: 'James Whitfield',
    location: 'London',
    quote:
      'I have travelled to 40 countries and the Munnar sunrise trek Triplora arranged is in my top five experiences, full stop.',
    rating: 5,
  },
  {
    name: 'Priya Menon',
    location: 'Bengaluru',
    quote:
      'As a solo traveller I felt completely looked after. The local guides were knowledgeable, warm and genuinely proud of Kerala.',
    rating: 5,
  },
]

export function Testimonials() {
  return (
    <section className="bg-secondary/50 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeading
          eyebrow="Traveller Stories"
          title="Loved by explorers worldwide"
          description="Real words from travellers who let us shape their Kerala story."
        />
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.figure
              key={testimonial.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: index * 0.12, ease: 'easeOut' }}
              className="flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border"
            >
              <div className="flex gap-1" aria-label={`Rated ${testimonial.rating} out of 5 stars`}>
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-accent text-accent" aria-hidden="true" />
                ))}
              </div>
              <blockquote className="text-sm leading-relaxed text-card-foreground">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-auto flex flex-col">
                <span className="text-sm font-semibold text-card-foreground">
                  {testimonial.name}
                </span>
                <span className="text-xs text-muted-foreground">{testimonial.location}</span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}
