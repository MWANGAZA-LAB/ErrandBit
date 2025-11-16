/**
 * Enhanced Dark Mode Utility
 * Features:
 * - Immediate application on load (no flash)
 * - System theme detection with auto-switching
 * - Cross-device sync via backend API
 * - Reduced motion support for accessibility
 */

export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Initialize dark mode on app load
 * Respects system preferences when theme is 'system'
 */
export function initDarkMode() {
  // Check for saved theme preference, default to 'dark'
  const savedTheme = (localStorage.getItem('theme') || 'dark') as ThemePreference;
  
  // Apply theme immediately
  applyTheme(savedTheme);
  
  // Listen for system theme changes when using 'system' preference
  if (savedTheme === 'system') {
    watchSystemTheme();
  }
  
  // Detect reduced motion preference for accessibility
  detectReducedMotion();
}

/**
 * Apply theme to document
 * @param theme - 'light', 'dark', or 'system'
 */
export function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  
  if (theme === 'dark') {
    root.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  } else {
    // System preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
    localStorage.setItem('theme', 'system');
    watchSystemTheme();
  }
  
  // Broadcast theme change to other tabs
  broadcastThemeChange(theme);
}

/**
 * Watch for system theme changes and apply automatically
 */
export function watchSystemTheme() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handler = (e: MediaQueryListEvent) => {
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'system') {
      document.documentElement.classList.toggle('dark', e.matches);
    }
  };
  
  // Remove existing listener if any
  mediaQuery.removeEventListener('change', handler);
  // Add new listener
  mediaQuery.addEventListener('change', handler);
}

/**
 * Detect reduced motion preference for accessibility
 * Disables transitions if user prefers reduced motion
 */
export function detectReducedMotion() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (prefersReducedMotion) {
    document.documentElement.classList.add('reduce-motion');
  }
  
  // Listen for changes
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
    document.documentElement.classList.toggle('reduce-motion', e.matches);
  });
}

/**
 * Broadcast theme change to other tabs/windows
 * Enables synchronized theme across multiple tabs
 */
function broadcastThemeChange(theme: ThemePreference) {
  try {
    localStorage.setItem('theme-broadcast', JSON.stringify({
      theme,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.warn('Failed to broadcast theme change:', error);
  }
}

/**
 * Listen for theme changes from other tabs
 */
export function listenForThemeChanges(callback: (theme: ThemePreference) => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === 'theme-broadcast' && e.newValue) {
      try {
        const { theme } = JSON.parse(e.newValue);
        applyTheme(theme);
        callback(theme);
      } catch (error) {
        console.warn('Failed to parse theme broadcast:', error);
      }
    }
  };
  
  window.addEventListener('storage', handler);
  
  // Return cleanup function
  return () => window.removeEventListener('storage', handler);
}

/**
 * Sync theme preference with backend
 * Enables cross-device theme synchronization
 */
export async function syncThemeWithBackend(theme: ThemePreference, userId: string) {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (!token) return;
    
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    
    await fetch(`${API_URL}/api/users/preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ themePreference: theme }),
    });
  } catch (error) {
    // Fail silently - theme preference not critical for functionality
    console.debug('Theme sync failed:', error);
  }
}

/**
 * Get current theme preference
 */
export function getCurrentTheme(): ThemePreference {
  return (localStorage.getItem('theme') || 'dark') as ThemePreference;
}

/**
 * Check if dark mode is currently active
 */
export function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}

// Initialize immediately when script loads
if (typeof window !== 'undefined') {
  initDarkMode();
}
