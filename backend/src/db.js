import { Pool } from 'pg';

let pool = null;

export function getPool() {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  pool = new Pool({ connectionString: url, max: 5 });
  return pool;
}

export async function checkDb() {
  try {
    const p = getPool();
    if (!p) return { connected: false, reason: 'DATABASE_URL not set' };
    const res = await p.query('select 1 as ok');
    return { connected: true, ok: res.rows[0]?.ok === 1 };
  } catch (e) {
    return { connected: false, error: e.message };
  }
}
