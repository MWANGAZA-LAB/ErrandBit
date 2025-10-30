/**
 * Nostr Type Definitions
 * Injected by Fedi app for privacy-preserving identity
 */

export interface NostrEvent {
  id?: string;
  pubkey?: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig?: string;
}

export interface NostrProvider {
  /**
   * Get the user's public key (npub)
   */
  getPublicKey(): Promise<string>;

  /**
   * Sign a Nostr event
   */
  signEvent(event: NostrEvent): Promise<NostrEvent>;

  /**
   * Get relays configured by the user
   */
  getRelays?(): Promise<Record<string, { read: boolean; write: boolean }>>;

  /**
   * Encrypt a message for a recipient
   */
  nip04?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
}

declare global {
  interface Window {
    nostr?: NostrProvider;
  }
}

export {};
