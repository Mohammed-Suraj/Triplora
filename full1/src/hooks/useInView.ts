import { useEffect, useRef, useState } from 'react'

/**
 * Reports whether the element is visible in the viewport.
 * Used to defer mounting the (heavy) Leaflet map until it is actually seen,
 * and to stop observing once loaded.
 */
export function useInView<T extends HTMLElement>(options?: { rootMargin?: string; once?: boolean }) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true)
            if (options?.once !== false) observer.disconnect()
          } else if (options?.once === false) {
            setInView(false)
          }
        }
      },
      { rootMargin: options?.rootMargin ?? '200px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { ref, inView }
}
