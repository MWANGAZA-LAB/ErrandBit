export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}
