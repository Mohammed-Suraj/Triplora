import { Link } from 'react-router-dom'
import { Compass, Facebook, Instagram, Twitter, Youtube } from 'lucide-react'

const footerLinks = [
  {
    title: 'Explore',
    links: [
      { label: 'All Destinations', to: '/explore' },
      { label: 'Trip Planner', to: '/planner' },
      { label: 'Wishlist', to: '/wishlist' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'Destinations',
    links: [
      { label: 'Munnar', to: '/destinations/munnar' },
      { label: 'Alleppey', to: '/destinations/alleppey' },
      { label: 'Kochi', to: '/destinations/kochi' },
      { label: 'Varkala', to: '/destinations/varkala' },
    ],
  },
]

const socials = [
  { label: 'Instagram', icon: Instagram, href: '#' },
  { label: 'Twitter', icon: Twitter, href: '#' },
  { label: 'Facebook', icon: Facebook, href: '#' },
  { label: 'YouTube', icon: Youtube, href: '#' },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Link
              to="/"
              className="flex items-center gap-2 font-serif text-xl font-bold text-card-foreground"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Compass className="h-5 w-5" aria-hidden="true" />
              </span>
              Triplora
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Curated journeys through God&apos;s Own Country. From misty tea hills to serene
              backwaters, discover Kerala the way it deserves to be seen.
            </p>
            <div className="flex items-center gap-2">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="press flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <social.icon className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {footerLinks.map((group) => (
            <div key={group.title} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-card-foreground">
                {group.title}
              </h3>
              <ul className="flex flex-col gap-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 md:flex-row">
          <p className="text-sm text-muted-foreground">
            {'\u00A9'} {new Date().getFullYear()} Triplora. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">Crafted with care in Kerala, India</p>
        </div>
      </div>
    </footer>
  )
}
