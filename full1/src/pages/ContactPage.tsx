import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Clock,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Send,
  Twitter,
  Youtube,
} from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { SmartImage } from '@/components/ui/SmartImage'
import { contactApi } from '@/lib/api'
import { cn } from '@/lib/utils'

const contactCards = [
  {
    icon: Mail,
    label: 'Email us',
    value: 'hello@triplora.travel',
    href: 'mailto:hello@triplora.travel',
  },
  {
    icon: Phone,
    label: 'Call us',
    value: '+91 484 123 4567',
    href: 'tel:+914841234567',
  },
  {
    icon: MapPin,
    label: 'Visit us',
    value: 'Marine Drive, Kochi, Kerala',
    href: '#map',
  },
  {
    icon: Clock,
    label: 'Working hours',
    value: 'Mon – Sat, 9am – 7pm IST',
    href: null,
  },
]

const socials = [
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Facebook, label: 'Facebook', href: '#' },
  { icon: Twitter, label: 'Twitter', href: '#' },
  { icon: Youtube, label: 'YouTube', href: '#' },
]

const faqs = [
  {
    q: 'Does Triplora book flights and hotels for me?',
    a: 'Triplora crafts your day-by-day itinerary and recommends trusted local stays and experiences. Bookings are handled with our vetted partners so you always travel with confidence.',
  },
  {
    q: 'When is the best time to visit Kerala?',
    a: 'September to March offers the most pleasant weather across most regions, while the monsoon months bring lush landscapes and dramatic waterfalls for the adventurous.',
  },
  {
    q: 'Can I customise the AI-generated itinerary?',
    a: 'Absolutely. Every plan is a starting point — adjust the pace, swap destinations, or tell us your interests and we will reshape the journey around you.',
  },
  {
    q: 'Is Triplora suitable for family trips?',
    a: 'Yes. We tailor itineraries for solo travellers, couples, families and groups, balancing comfort, activities and downtime for every kind of traveller.',
  },
]

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    try {
      await contactApi.send({
        name: String(form.get('name') ?? ''),
        email: String(form.get('email') ?? ''),
        subject: String(form.get('subject') ?? ''),
        message: String(form.get('message') ?? ''),
      })
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your message. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pt-28 pb-20 md:pt-32">
      {/* Heading */}
      <section className="mx-auto max-w-7xl px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">
            Get in touch
          </span>
          <h1 className="max-w-2xl font-serif text-4xl font-bold text-balance text-foreground md:text-5xl">
            Let&apos;s plan something unforgettable
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-pretty text-muted-foreground">
            Questions, ideas or a dream trip in mind? Our Kerala travel experts are here to help.
          </p>
        </motion.div>
      </section>

      {/* Contact cards */}
      <section className="mx-auto mt-12 max-w-7xl px-4 md:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {contactCards.map((card, index) => {
            const content = (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <card.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-muted-foreground">{card.label}</span>
                  <span className="text-sm font-semibold text-card-foreground">{card.value}</span>
                </div>
              </>
            )
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: index * 0.08, ease: 'easeOut' }}
              >
                {card.href ? (
                  <a
                    href={card.href}
                    className="flex h-full items-center gap-3 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {content}
                  </a>
                ) : (
                  <div className="flex h-full items-center gap-3 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
                    {content}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Form + Map */}
      <section className="mx-auto mt-16 max-w-7xl px-4 md:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8"
          >
            {submitted ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 py-12 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
                </span>
                <h2 className="font-serif text-2xl font-semibold text-card-foreground">
                  Message sent!
                </h2>
                <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Thank you for reaching out. Our team will get back to you within one business day.
                </p>
                <Button variant="outline" onClick={() => setSubmitted(false)}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="name" className="text-sm font-medium text-card-foreground">
                      Full name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      placeholder="Aarav Menon"
                      className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="email" className="text-sm font-medium text-card-foreground">
                      Email address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="subject" className="text-sm font-medium text-card-foreground">
                    Subject
                  </label>
                  <input
                    id="subject"
                    name="subject"
                    type="text"
                    required
                    placeholder="Planning a 5-day Kerala trip"
                    className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="message" className="text-sm font-medium text-card-foreground">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={5}
                    placeholder="Tell us about your dream Kerala journey..."
                    className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  />
                </div>
                {error && (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-300"
                  >
                    {error}
                  </p>
                )}
                <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? 'Sending...' : 'Send message'}
                  <Send className="h-4 w-4" aria-hidden="true" />
                </Button>
              </form>
            )}
          </motion.div>

          {/* Map placeholder + socials */}
          <motion.div
            id="map"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, delay: 0.1, ease: 'easeOut' }}
            className="flex flex-col gap-6"
          >
            <div className="relative flex-1 overflow-hidden rounded-2xl shadow-sm ring-1 ring-border">
              <SmartImage
                src="/images/kochi.png"
                alt="Map location of Triplora in Kochi, Kerala"
                className="h-full min-h-64 w-full"
              />
              <div className="absolute inset-0 bg-black/25" />
              <div className="glass-strong absolute bottom-4 left-4 flex items-center gap-2 rounded-full px-4 py-2">
                <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="text-sm font-medium text-foreground">
                  Marine Drive, Kochi, Kerala
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-secondary p-6">
              <h3 className="font-serif text-lg font-semibold text-secondary-foreground">
                Follow the journey
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Daily doses of Kerala inspiration across our channels.
              </p>
              <div className="mt-4 flex gap-3">
                {socials.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground shadow-sm ring-1 ring-border transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <social.icon className="h-5 w-5" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto mt-20 max-w-3xl px-4 md:mt-28 md:px-6">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions, answered"
          description="Everything you need to know before you set off with Triplora."
        />
        <div className="mt-10 flex flex-col gap-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index
            return (
              <motion.div
                key={faq.q}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: index * 0.06, ease: 'easeOut' }}
                className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="font-medium text-card-foreground">{faq.q}</span>
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center text-xl leading-none text-primary transition-transform duration-200',
                      isOpen && 'rotate-45',
                    )}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </button>
                <div
                  className={cn(
                    'grid transition-all duration-300 ease-out',
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 text-sm leading-relaxed text-muted-foreground">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
