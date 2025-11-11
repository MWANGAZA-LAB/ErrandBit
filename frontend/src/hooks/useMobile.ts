/**
 * Mobile Detection and Responsive Hooks
 * 
 * Utilities for detecting mobile devices, screen sizes, and touch capabilities
 */

import { useState, useEffect } from 'react'

/**
 * Breakpoints (matching Tailwind CSS)
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

/**
 * Detect if device is mobile
 */
export function useIsMobile(breakpoint: number = BREAKPOINTS.md): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }

    // Initial check
    checkMobile()

    // Listen for resize
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [breakpoint])

  return isMobile
}

/**
 * Get current screen size category
 */
export function useScreenSize(): 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' {
  const [size, setSize] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'>('md')

  useEffect(() => {
    const checkSize = () => {
      const width = window.innerWidth
      if (width < BREAKPOINTS.sm) setSize('xs')
      else if (width < BREAKPOINTS.md) setSize('sm')
      else if (width < BREAKPOINTS.lg) setSize('md')
      else if (width < BREAKPOINTS.xl) setSize('lg')
      else if (width < BREAKPOINTS['2xl']) setSize('xl')
      else setSize('2xl')
    }

    checkSize()
    window.addEventListener('resize', checkSize)
    return () => window.removeEventListener('resize', checkSize)
  }, [])

  return size
}

/**
 * Detect if device has touch capability
 */
export function useHasTouch(): boolean {
  const [hasTouch, setHasTouch] = useState(false)

  useEffect(() => {
    setHasTouch(
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-expect-error - msMaxTouchPoints is IE specific
      navigator.msMaxTouchPoints > 0
    )
  }, [])

  return hasTouch
}

/**
 * Get device orientation
 */
export function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')

  useEffect(() => {
    const checkOrientation = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      )
    }

    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)

    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [])

  return orientation
}

/**
 * Detect if user is on iOS
 */
export function useIsIOS(): boolean {
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream
    setIsIOS(iOS)
  }, [])

  return isIOS
}

/**
 * Detect if user is on Android
 */
export function useIsAndroid(): boolean {
  const [isAndroid, setIsAndroid] = useState(false)

  useEffect(() => {
    setIsAndroid(/Android/.test(navigator.userAgent))
  }, [])

  return isAndroid
}

/**
 * Get safe area insets (for notched devices)
 */
export function useSafeAreaInsets() {
  const [insets, setInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  })

  useEffect(() => {
    const computedStyle = getComputedStyle(document.documentElement)
    
    setInsets({
      top: parseInt(computedStyle.getPropertyValue('--sat') || '0'),
      right: parseInt(computedStyle.getPropertyValue('--sar') || '0'),
      bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0'),
      left: parseInt(computedStyle.getPropertyValue('--sal') || '0'),
    })
  }, [])

  return insets
}

/**
 * Detect if device is in standalone mode (PWA)
 */
export function useIsStandalone(): boolean {
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const standalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error - standalone is iOS specific
      window.navigator.standalone === true

    setIsStandalone(standalone)
  }, [])

  return isStandalone
}

/**
 * Get viewport dimensions
 */
export function useViewport() {
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return viewport
}

/**
 * Media query hook
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    
    if (media.matches !== matches) {
      setMatches(media.matches)
    }

    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)
    
    return () => media.removeEventListener('change', listener)
  }, [matches, query])

  return matches
}

/**
 * Detect if keyboard is visible (mobile)
 */
export function useKeyboardVisible(): boolean {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const initialHeight = window.innerHeight

    const handleResize = () => {
      const currentHeight = window.innerHeight
      // Keyboard is likely visible if viewport height decreased significantly
      setIsVisible(currentHeight < initialHeight * 0.75)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return isVisible
}
