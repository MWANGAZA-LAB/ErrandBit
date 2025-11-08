/**
 * Express type extensions
 * Adds user property to Request
 */

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username?: string;
        phone?: string;
        email?: string;
        nostr_pubkey?: string;
        role?: string;
        created_at?: Date;
      };
      userId?: number | string;
    }
  }
}
