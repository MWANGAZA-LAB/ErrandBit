/**
 * Custom Hook for Keyboard Navigation
 * Provides accessible keyboard navigation for lists and menus
 */

import { useEffect, useRef, useState, useCallback } from 'react'

interface UseKeyboardNavigationOptions {
  onSelect?: (index: number) => void
  onEscape?: () => void
  loop?: boolean
  initialIndex?: number
}

export function useKeyboardNavigation<T extends HTMLElement>(
  itemCount: number,
  options: UseKeyboardNavigationOptions = {}
) {
  const { onSelect, onEscape, loop = true, initialIndex = 0 } = options
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const itemRefs = useRef<(T | null)[]>([])

  // Set ref for an item
  const setItemRef = useCallback((index: number) => {
    return (el: T | null) => {
      itemRefs.current[index] = el
    }
  }, [])

  // Navigate to specific index
  const navigateToIndex = useCallback(
    (index: number) => {
      let newIndex = index

      if (loop) {
        // Wrap around
        if (newIndex < 0) newIndex = itemCount - 1
        if (newIndex >= itemCount) newIndex = 0
      } else {
        // Clamp to bounds
        newIndex = Math.max(0, Math.min(itemCount - 1, newIndex))
      }

      setActiveIndex(newIndex)
      itemRefs.current[newIndex]?.focus()
    },
    [itemCount, loop]
  )

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
        case 'Down':
          event.preventDefault()
          navigateToIndex(activeIndex + 1)
          break

        case 'ArrowUp':
        case 'Up':
          event.preventDefault()
          navigateToIndex(activeIndex - 1)
          break

        case 'Home':
          event.preventDefault()
          navigateToIndex(0)
          break

        case 'End':
          event.preventDefault()
          navigateToIndex(itemCount - 1)
          break

        case 'Enter':
        case ' ':
          event.preventDefault()
          onSelect?.(activeIndex)
          break

        case 'Escape':
        case 'Esc':
          event.preventDefault()
          onEscape?.()
          break
      }
    },
    [activeIndex, itemCount, navigateToIndex, onSelect, onEscape]
  )

  // Attach keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Focus first item on mount
  useEffect(() => {
    if (itemRefs.current[initialIndex]) {
      itemRefs.current[initialIndex]?.focus()
    }
  }, [initialIndex])

  return {
    activeIndex,
    setActiveIndex,
    setItemRef,
    navigateToIndex,
  }
}

/**
 * Hook for managing focus trap (useful for modals/dialogs)
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Store previously focused element
    const previouslyFocused = document.activeElement as HTMLElement

    // Focus first element
    firstElement?.focus()

    function handleTabKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          lastElement?.focus()
          e.preventDefault()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          firstElement?.focus()
          e.preventDefault()
        }
      }
    }

    container.addEventListener('keydown', handleTabKey)

    // Cleanup
    return () => {
      container.removeEventListener('keydown', handleTabKey)
      // Restore focus
      previouslyFocused?.focus()
    }
  }, [isActive])

  return containerRef
}

/**
 * Hook for announcing changes to screen readers
 */
export function useScreenReaderAnnouncement() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div')
    announcement.setAttribute('role', 'status')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message

    document.body.appendChild(announcement)

    // Remove after announcement
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement)
      }
    }, 1000)
  }, [])

  return announce
}
