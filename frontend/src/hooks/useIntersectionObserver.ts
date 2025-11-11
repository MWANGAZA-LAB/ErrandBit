import { useEffect, useRef, useState } from 'react'

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  freezeOnceVisible?: boolean
}

/**
 * Custom hook for Intersection Observer API
 * Useful for lazy loading, infinite scroll, and visibility tracking
 */
export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): [React.RefObject<HTMLDivElement>, boolean] {
  const { threshold = 0, root = null, rootMargin = '0%', freezeOnceVisible = false } = options

  const elementRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    // If already visible and should freeze, don't observe
    if (freezeOnceVisible && isVisible) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting
        setIsVisible(isIntersecting)

        // If visible and should freeze, disconnect observer
        if (isIntersecting && freezeOnceVisible) {
          observer.disconnect()
        }
      },
      { threshold, root, rootMargin }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [threshold, root, rootMargin, freezeOnceVisible, isVisible])

  return [elementRef, isVisible]
}
