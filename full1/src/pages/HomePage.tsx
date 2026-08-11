import { Hero } from '@/components/home/Hero'
import { MyBookingsSection } from '@/components/home/MyBookingsSection'
import { FeaturedDestinations } from '@/components/home/FeaturedDestinations'
import { RecommendedForYou } from '@/components/home/RecommendedForYou'
import { ExperienceSection } from '@/components/home/ExperienceSection'
import { PlannerCta } from '@/components/home/PlannerCta'
import { Testimonials } from '@/components/home/Testimonials'

export function HomePage() {
  return (
    <>
      <Hero />
      <MyBookingsSection />
      <FeaturedDestinations />
      <RecommendedForYou />
      <ExperienceSection />
      <PlannerCta />
      <Testimonials />
    </>
  )
}

