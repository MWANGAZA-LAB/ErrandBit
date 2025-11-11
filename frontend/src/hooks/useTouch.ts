/**
 * Touch Gesture Hooks
 * 
 * Utilities for handling touch gestures like swipe, pinch, long press
 */

import { useRef, useEffect, TouchEvent } from 'react'

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

interface SwipeOptions {
  minSwipeDistance?: number
  maxSwipeTime?: number
}

/**
 * Swipe gesture detection
 */
export function useSwipe(
  handlers: SwipeHandlers,
  options: SwipeOptions = {}
) {
  const { minSwipeDistance = 50, maxSwipeTime = 300 } = options
  
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null)

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0]
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    }
  }

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStart.current) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStart.current.x
    const deltaY = touch.clientY - touchStart.current.y
    const deltaTime = Date.now() - touchStart.current.time

    // Check if swipe was fast enough
    if (deltaTime > maxSwipeTime) {
      touchStart.current = null
      return
    }

    // Determine swipe direction
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    if (absX > absY && absX > minSwipeDistance) {
      // Horizontal swipe
      if (deltaX > 0) {
        handlers.onSwipeRight?.()
      } else {
        handlers.onSwipeLeft?.()
      }
    } else if (absY > absX && absY > minSwipeDistance) {
      // Vertical swipe
      if (deltaY > 0) {
        handlers.onSwipeDown?.()
      } else {
        handlers.onSwipeUp?.()
      }
    }

    touchStart.current = null
  }

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  }
}

/**
 * Long press detection
 */
export function useLongPress(
  onLongPress: () => void,
  options: { delay?: number } = {}
) {
  const { delay = 500 } = options
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const isLongPress = useRef(false)

  const start = () => {
    isLongPress.current = false
    timerRef.current = setTimeout(() => {
      isLongPress.current = true
      onLongPress()
    }, delay)
  }

  const cancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
  }

  const handleClick = () => {
    if (isLongPress.current) {
      // Prevent click after long press
      return false
    }
  }

  return {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: cancel,
    onClick: handleClick,
  }
}

/**
 * Pull to refresh
 */
export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  options: { threshold?: number; maxPull?: number } = {}
) {
  const { threshold = 80, maxPull = 150 } = options
  
  const pullStart = useRef<number | null>(null)
  const isPulling = useRef(false)
  const isRefreshing = useRef(false)

  const handleTouchStart = (e: TouchEvent) => {
    // Only start pull if at top of page
    if (window.scrollY === 0) {
      pullStart.current = e.touches[0].clientY
      isPulling.current = true
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isPulling.current || pullStart.current === null || isRefreshing.current) return

    const currentY = e.touches[0].clientY
    const pullDistance = currentY - pullStart.current

    // Only allow pulling down
    if (pullDistance > 0) {
      // Prevent default scroll
      e.preventDefault()
      
      // Calculate pull with resistance
      const resistance = Math.min(pullDistance, maxPull)
      
      // Visual feedback could be added here
      // e.g., update a ref that controls a loading indicator
    }
  }

  const handleTouchEnd = async (e: TouchEvent) => {
    if (!isPulling.current || pullStart.current === null) return

    const currentY = e.changedTouches[0].clientY
    const pullDistance = currentY - pullStart.current

    isPulling.current = false
    pullStart.current = null

    // Trigger refresh if pulled far enough
    if (pullDistance >= threshold && !isRefreshing.current) {
      isRefreshing.current = true
      try {
        await onRefresh()
      } finally {
        isRefreshing.current = false
      }
    }
  }

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  }
}

/**
 * Pinch zoom detection
 */
export function usePinchZoom(
  onZoom: (scale: number) => void,
  options: { minScale?: number; maxScale?: number } = {}
) {
  const { minScale = 0.5, maxScale = 3 } = options
  
  const initialDistance = useRef<number | null>(null)
  const currentScale = useRef(1)

  const getDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      initialDistance.current = getDistance(e.touches)
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && initialDistance.current) {
      e.preventDefault()
      
      const currentDistance = getDistance(e.touches as unknown as React.TouchList)
      const scale = currentDistance / initialDistance.current
      
      // Apply scale limits
      const newScale = Math.max(minScale, Math.min(maxScale, currentScale.current * scale))
      
      onZoom(newScale)
      initialDistance.current = currentDistance
    }
  }

  const handleTouchEnd = () => {
    initialDistance.current = null
  }

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  }
}

/**
 * Tap detection (distinguishes from scroll)
 */
export function useTap(onTap: () => void, options: { maxMoveDistance?: number } = {}) {
  const { maxMoveDistance = 10 } = options
  
  const startPos = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0]
    startPos.current = {
      x: touch.clientX,
      y: touch.clientY,
    }
  }

  const handleTouchEnd = (e: TouchEvent) => {
    if (!startPos.current) return

    const touch = e.changedTouches[0]
    const deltaX = Math.abs(touch.clientX - startPos.current.x)
    const deltaY = Math.abs(touch.clientY - startPos.current.y)

    // Only trigger tap if finger didn't move much
    if (deltaX < maxMoveDistance && deltaY < maxMoveDistance) {
      onTap()
    }

    startPos.current = null
  }

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  }
}

/**
 * Prevent scroll (useful for modals on mobile)
 */
export function usePreventScroll(isActive: boolean) {
  useEffect(() => {
    if (!isActive) return

    const originalStyle = window.getComputedStyle(document.body).overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [isActive])
}
