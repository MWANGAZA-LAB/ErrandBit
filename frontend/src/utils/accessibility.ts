/**
 * Accessibility Utilities
 * Helper functions for WCAG 2.1 AA/AAA compliance
 */

/**
 * Announce message to screen readers
 * Uses ARIA live regions for dynamic content updates
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message

  document.body.appendChild(announcement)

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

/**
 * Check if element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  if (element.tabIndex < 0) return false
  if (element.hasAttribute('disabled')) return false
  if (element.getAttribute('aria-hidden') === 'true') return false

  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden') return false

  return true
}

/**
 * Trap focus within a container (useful for modals)
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )

  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]

  function handleTabKey(e: KeyboardEvent) {
    if (e.key !== 'Tab') return

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        lastElement.focus()
        e.preventDefault()
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        firstElement.focus()
        e.preventDefault()
      }
    }
  }

  container.addEventListener('keydown', handleTabKey)

  // Focus first element
  firstElement?.focus()

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleTabKey)
  }
}

/**
 * Get contrast ratio between two colors
 * Used to ensure WCAG AA (4.5:1) or AAA (7:1) compliance
 */
export function getContrastRatio(color1: string, color2: string): number {
  const luminance1 = getRelativeLuminance(color1)
  const luminance2 = getRelativeLuminance(color2)

  const lighter = Math.max(luminance1, luminance2)
  const darker = Math.min(luminance1, luminance2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Calculate relative luminance of a color
 */
function getRelativeLuminance(color: string): number {
  // Convert hex to RGB
  const hex = color.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16) / 255
  const g = parseInt(hex.substr(2, 2), 16) / 255
  const b = parseInt(hex.substr(4, 2), 16) / 255

  // Apply gamma correction
  const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)
  const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)
  const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4)

  return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB
}

/**
 * Check if contrast meets WCAG standards
 */
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background)

  if (level === 'AAA') {
    return isLargeText ? ratio >= 4.5 : ratio >= 7
  }

  return isLargeText ? ratio >= 3 : ratio >= 4.5
}

/**
 * Generate unique ID for ARIA relationships
 */
let idCounter = 0
export function generateAriaId(prefix: string = 'aria'): string {
  return `${prefix}-${++idCounter}-${Date.now()}`
}

/**
 * Handle keyboard navigation for lists
 */
export function handleListKeyboardNavigation(
  event: KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number,
  onSelect?: (index: number) => void
): number {
  let newIndex = currentIndex

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      newIndex = Math.min(currentIndex + 1, items.length - 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      newIndex = Math.max(currentIndex - 1, 0)
      break
    case 'Home':
      event.preventDefault()
      newIndex = 0
      break
    case 'End':
      event.preventDefault()
      newIndex = items.length - 1
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      onSelect?.(currentIndex)
      return currentIndex
  }

  if (newIndex !== currentIndex) {
    items[newIndex]?.focus()
  }

  return newIndex
}

/**
 * Create accessible error message
 */
export function createAccessibleError(
  fieldId: string,
  errorMessage: string
): HTMLElement {
  const errorId = `${fieldId}-error`
  const errorElement = document.createElement('div')
  errorElement.id = errorId
  errorElement.className = 'text-sm text-red-600 mt-1'
  errorElement.setAttribute('role', 'alert')
  errorElement.setAttribute('aria-live', 'assertive')
  errorElement.textContent = errorMessage

  return errorElement
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Check if user prefers dark mode
 */
export function prefersDarkMode(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches
}

/**
 * Get accessible label for time
 */
export function getAccessibleTimeLabel(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format currency for screen readers
 */
export function getAccessibleCurrencyLabel(cents: number): string {
  const dollars = cents / 100
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars)

  // Add "dollars and cents" for clarity
  const wholeDollars = Math.floor(dollars)
  const remainingCents = cents % 100

  if (remainingCents === 0) {
    return `${wholeDollars} dollar${wholeDollars === 1 ? '' : 's'}`
  }

  return `${formatted}, ${wholeDollars} dollar${wholeDollars === 1 ? '' : 's'} and ${remainingCents} cent${remainingCents === 1 ? '' : 's'}`
}
