import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { Destination } from '@/data/destinations'
import { destinationsApi } from '@/lib/api'
import { DestinationCard } from '@/components/DestinationCard'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { DestinationGridSkeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'

export function FeaturedDestinations() {
  const [featured, setFeatured] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    destinationsApi
      .list({ limit: '6', sortBy: 'rating', sortOrder: 'desc' })
      .then((res) => {
        if (active) setFeatured(res.data)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
      <SectionHeading
        eyebrow="Featured Destinations"
        title="Places that stay with you forever"
        description="Handpicked experiences across Kerala's hills, backwaters, beaches and forests — each one verified by our local travel experts."
      />
      <div className="mt-12">
        {loading ? (
          <DestinationGridSkeleton count={6} />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((destination, index) => (
              <DestinationCard key={destination.id} destination={destination} index={index} />
            ))}
          </div>
        )}
      </div>
      <div className="mt-12 flex justify-center">
        <Link to="/explore">
          <Button variant="outline" size="lg">
            View All Destinations
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </section>
  )
}
