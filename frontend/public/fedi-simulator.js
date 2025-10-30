/**
 * Fedi Environment Simulator
 * Injects WebLN and Nostr APIs for local testing
 * 
 * Usage: Open browser console and run:
 * - simulateFedi() to enable both WebLN and Nostr
 * - simulateWebLN() to enable only WebLN
 * - simulateNostr() to enable only Nostr
 */

(function() {
  'use strict';

  // Mock WebLN implementation
  const mockWebLN = {
    enabled: false,
    
    async enable() {
      console.log('[Fedi Simulator] WebLN enabled');
      this.enabled = true;
      return Promise.resolve();
    },
    
    async getInfo() {
      console.log('[Fedi Simulator] getInfo called');
      return {
        node: {
          alias: 'Fedi Test Node',
          pubkey: '02abc123...',
          color: '#f7931a'
        },
        methods: ['sendPayment', 'makeInvoice', 'signMessage'],
        version: '1.0.0',
        supports: ['lightning']
      };
    },
    
    async sendPayment(invoice) {
      console.log('[Fedi Simulator] sendPayment called with invoice:', invoice);
      
      // Simulate payment delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate successful payment
      const preimage = 'mock_preimage_' + Math.random().toString(36).substring(7);
      const paymentHash = 'mock_hash_' + Math.random().toString(36).substring(7);
      
      console.log('[Fedi Simulator] Payment successful:', { preimage, paymentHash });
      
      return {
        preimage,
        paymentHash,
        route: {
          total_amt: 50000,
          total_fees: 0
        }
      };
    },
    
    async makeInvoice(args) {
      console.log('[Fedi Simulator] makeInvoice called with args:', args);
      
      const amount = args.amount || args.defaultAmount || 0;
      const memo = args.defaultMemo || 'ErrandBit payment';
      
      // Generate mock invoice
      const paymentRequest = 'lnbc' + amount + 'n1p' + Math.random().toString(36).substring(7);
      const paymentHash = 'mock_hash_' + Math.random().toString(36).substring(7);
      
      console.log('[Fedi Simulator] Invoice created:', { paymentRequest, amount, memo });
      
      return {
        paymentRequest,
        paymentHash,
        rHash: paymentHash
      };
    },
    
    async signMessage(message) {
      console.log('[Fedi Simulator] signMessage called with:', message);
      
      const signature = 'mock_signature_' + Math.random().toString(36).substring(7);
      
      return {
        message,
        signature
      };
    },
    
    async verifyMessage(signature, message) {
      console.log('[Fedi Simulator] verifyMessage called');
      return Promise.resolve();
    },
    
    async keysend(args) {
      console.log('[Fedi Simulator] keysend called with args:', args);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        preimage: 'mock_preimage_' + Math.random().toString(36).substring(7),
        paymentHash: 'mock_hash_' + Math.random().toString(36).substring(7)
      };
    }
  };

  // Mock Nostr implementation
  const mockNostr = {
    async getPublicKey() {
      console.log('[Fedi Simulator] Nostr getPublicKey called');
      
      // Generate consistent mock pubkey
      const pubkey = 'npub1' + Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
      
      console.log('[Fedi Simulator] Public key:', pubkey);
      return pubkey;
    },
    
    async signEvent(event) {
      console.log('[Fedi Simulator] Nostr signEvent called with:', event);
      
      const signedEvent = {
        ...event,
        id: 'event_' + Math.random().toString(36).substring(7),
        pubkey: await this.getPublicKey(),
        sig: 'signature_' + Math.random().toString(36).substring(7),
        created_at: event.created_at || Math.floor(Date.now() / 1000)
      };
      
      console.log('[Fedi Simulator] Event signed:', signedEvent);
      return signedEvent;
    },
    
    async getRelays() {
      console.log('[Fedi Simulator] Nostr getRelays called');
      
      return {
        'wss://relay.damus.io': { read: true, write: true },
        'wss://relay.nostr.band': { read: true, write: false }
      };
    },
    
    nip04: {
      async encrypt(pubkey, plaintext) {
        console.log('[Fedi Simulator] NIP-04 encrypt called');
        
        // Mock encryption (just base64 encode for demo)
        const encrypted = btoa(plaintext + '_encrypted_for_' + pubkey);
        console.log('[Fedi Simulator] Encrypted:', encrypted);
        
        return encrypted;
      },
      
      async decrypt(pubkey, ciphertext) {
        console.log('[Fedi Simulator] NIP-04 decrypt called');
        
        // Mock decryption
        try {
          const decrypted = atob(ciphertext).replace(/_encrypted_for_.*$/, '');
          console.log('[Fedi Simulator] Decrypted:', decrypted);
          return decrypted;
        } catch (e) {
          return 'Decrypted message';
        }
      }
    }
  };

  // Simulation functions
  window.simulateWebLN = function() {
    window.webln = mockWebLN;
    console.log('%c[Fedi Simulator] WebLN injected!', 'color: #f7931a; font-weight: bold');
    console.log('WebLN is now available. Reload the page to activate.');
    return 'WebLN simulated. Reload page to activate.';
  };

  window.simulateNostr = function() {
    window.nostr = mockNostr;
    console.log('%c[Fedi Simulator] Nostr injected!', 'color: #8b5cf6; font-weight: bold');
    console.log('Nostr is now available. Reload the page to activate.');
    return 'Nostr simulated. Reload page to activate.';
  };

  window.simulateFedi = function() {
    window.webln = mockWebLN;
    window.nostr = mockNostr;
    console.log('%c[Fedi Simulator] Full Fedi environment injected!', 'color: #10b981; font-weight: bold');
    console.log('WebLN and Nostr are now available. Reload the page to activate.');
    return 'Full Fedi environment simulated. Reload page to activate.';
  };

  window.clearFediSimulation = function() {
    delete window.webln;
    delete window.nostr;
    console.log('[Fedi Simulator] Simulation cleared. Reload page to reset.');
    return 'Simulation cleared. Reload page.';
  };

  // Auto-inject if query parameter present
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('fedi-sim') === 'true') {
    window.simulateFedi();
  } else if (urlParams.get('webln-sim') === 'true') {
    window.simulateWebLN();
  } else if (urlParams.get('nostr-sim') === 'true') {
    window.simulateNostr();
  }

  // Display help on load
  console.log('%cFedi Simulator Loaded', 'color: #3b82f6; font-size: 16px; font-weight: bold');
  console.log('%cAvailable commands:', 'color: #6b7280; font-weight: bold');
  console.log('  simulateFedi()    - Enable WebLN + Nostr');
  console.log('  simulateWebLN()   - Enable WebLN only');
  console.log('  simulateNostr()   - Enable Nostr only');
  console.log('  clearFediSimulation() - Remove simulation');
  console.log('%cOr add ?fedi-sim=true to URL', 'color: #6b7280; font-style: italic');
})();
