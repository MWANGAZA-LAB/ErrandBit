/**
 * Dark Mode Initialization Utility
 * Ensures dark mode is applied immediately on app load
 */

export function initDarkMode() {
  // Check for saved theme preference, default to 'dark'
  const savedTheme = localStorage.getItem('theme') || 'dark';
  
  // Apply theme immediately
  applyTheme(savedTheme as 'light' | 'dark' | 'system');
}

export function applyTheme(theme: 'light' | 'dark' | 'system') {
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
  }
}

// Initialize immediately when script loads
if (typeof window !== 'undefined') {
  initDarkMode();
}
