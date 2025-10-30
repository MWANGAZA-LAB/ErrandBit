/**
 * Nostr Identity Service
 * Privacy-preserving identity using Nostr public keys
 * Alternative to phone/email verification
 */

import type { NostrProvider, NostrEvent } from '../types/nostr';

export interface NostrProfile {
  pubkey: string;
  npub: string; // bech32 encoded public key
  displayName?: string;
  about?: string;
  picture?: string;
  nip05?: string; // Nostr address (like email)
}

export class NostrIdentityService {
  private nostr: NostrProvider | null = null;
  private currentPubkey: string | null = null;

  /**
   * Check if Nostr is available (running in Fedi app)
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.nostr;
  }

  /**
   * Get user's public key (identity)
   */
  async getPublicKey(): Promise<string | null> {
    if (!this.isAvailable()) {
      console.warn('Nostr not available - not running in Fedi app');
      return null;
    }

    try {
      this.nostr = window.nostr!;
      this.currentPubkey = await this.nostr.getPublicKey();
      console.log('Nostr public key retrieved:', this.currentPubkey);
      return this.currentPubkey;
    } catch (error) {
      console.error('Failed to get Nostr public key:', error);
      return null;
    }
  }

  /**
   * Convert hex pubkey to npub (bech32 format)
   */
  hexToNpub(hex: string): string {
    // In production, use nostr-tools library for proper encoding
    // For now, return hex with npub prefix for display
    return `npub1${hex.substring(0, 10)}...`;
  }

  /**
   * Sign a Nostr event
   * Used for authentication and message verification
   */
  async signEvent(event: Partial<NostrEvent>): Promise<NostrEvent | null> {
    if (!this.nostr) {
      console.error('Nostr not initialized');
      return null;
    }

    try {
      const fullEvent: NostrEvent = {
        created_at: Math.floor(Date.now() / 1000),
        kind: event.kind || 1,
        tags: event.tags || [],
        content: event.content || '',
        pubkey: this.currentPubkey || undefined,
      };

      const signed = await this.nostr.signEvent(fullEvent);
      return signed;
    } catch (error) {
      console.error('Failed to sign Nostr event:', error);
      return null;
    }
  }

  /**
   * Create authentication event
   * Used to prove identity without revealing personal info
   */
  async createAuthEvent(challenge: string): Promise<NostrEvent | null> {
    return this.signEvent({
      kind: 22242, // NIP-42 auth event
      content: '',
      tags: [
        ['challenge', challenge],
        ['relay', window.location.origin],
      ],
    });
  }

  /**
   * Encrypt a direct message to another user
   */
  async encryptMessage(recipientPubkey: string, message: string): Promise<string | null> {
    if (!this.nostr?.nip04) {
      console.warn('NIP-04 encryption not available');
      return null;
    }

    try {
      return await this.nostr.nip04.encrypt(recipientPubkey, message);
    } catch (error) {
      console.error('Failed to encrypt message:', error);
      return null;
    }
  }

  /**
   * Decrypt a direct message from another user
   */
  async decryptMessage(senderPubkey: string, encryptedMessage: string): Promise<string | null> {
    if (!this.nostr?.nip04) {
      console.warn('NIP-04 decryption not available');
      return null;
    }

    try {
      return await this.nostr.nip04.decrypt(senderPubkey, encryptedMessage);
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      return null;
    }
  }

  /**
   * Get user's configured relays
   */
  async getRelays(): Promise<Record<string, { read: boolean; write: boolean }> | null> {
    if (!this.nostr?.getRelays) {
      return null;
    }

    try {
      return await this.nostr.getRelays();
    } catch (error) {
      console.error('Failed to get relays:', error);
      return null;
    }
  }

  /**
   * Create a profile update event
   */
  async updateProfile(profile: Partial<NostrProfile>): Promise<NostrEvent | null> {
    const metadata = {
      name: profile.displayName,
      about: profile.about,
      picture: profile.picture,
      nip05: profile.nip05,
    };

    return this.signEvent({
      kind: 0, // Metadata event
      content: JSON.stringify(metadata),
      tags: [],
    });
  }

  /**
   * Create a text note event
   * Can be used for public reviews or announcements
   */
  async publishNote(content: string, tags: string[][] = []): Promise<NostrEvent | null> {
    return this.signEvent({
      kind: 1, // Text note
      content,
      tags,
    });
  }

  /**
   * Get current user's public key
   */
  get pubkey(): string | null {
    return this.currentPubkey;
  }

  /**
   * Get npub representation of current user
   */
  get npub(): string | null {
    return this.currentPubkey ? this.hexToNpub(this.currentPubkey) : null;
  }
}

// Singleton instance
export const nostrIdentityService = new NostrIdentityService();
