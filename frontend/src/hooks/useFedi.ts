/**
 * React Hook for Fedi Integration
 * Provides easy access to WebLN and Nostr functionality
 */

import { useState, useEffect } from 'react';
import { fediPaymentService } from '../services/fedi-payment';
import { nostrIdentityService } from '../services/nostr-identity';

export interface FediStatus {
  isInFedi: boolean;
  weblnAvailable: boolean;
  weblnEnabled: boolean;
  nostrAvailable: boolean;
  nostrPubkey: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useFedi() {
  const [status, setStatus] = useState<FediStatus>({
    isInFedi: false,
    weblnAvailable: false,
    weblnEnabled: false,
    nostrAvailable: false,
    nostrPubkey: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    initializeFedi();
  }, []);

  const initializeFedi = async () => {
    try {
      const weblnAvailable = fediPaymentService.isAvailable();
      const nostrAvailable = nostrIdentityService.isAvailable();

      // Initialize WebLN if available
      let weblnEnabled = false;
      if (weblnAvailable) {
        weblnEnabled = await fediPaymentService.initialize();
      }

      // Get Nostr pubkey if available
      let nostrPubkey = null;
      if (nostrAvailable) {
        nostrPubkey = await nostrIdentityService.getPublicKey();
      }

      setStatus({
        isInFedi: weblnAvailable || nostrAvailable,
        weblnAvailable,
        weblnEnabled,
        nostrAvailable,
        nostrPubkey,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      setStatus((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to initialize Fedi',
      }));
    }
  };

  return {
    ...status,
    paymentService: fediPaymentService,
    identityService: nostrIdentityService,
    reinitialize: initializeFedi,
  };
}
