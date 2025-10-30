/**
 * WebLN Type Definitions
 * Injected by Fedi app for seamless Lightning payments
 */

export interface WebLNProvider {
  /**
   * Enable WebLN and request permission from user
   */
  enable(): Promise<void>;

  /**
   * Get information about the WebLN provider
   */
  getInfo(): Promise<{
    node: {
      alias: string;
      pubkey: string;
      color?: string;
    };
    methods: string[];
    version: string;
    supports?: string[];
  }>;

  /**
   * Send a Lightning payment
   * @param invoice - BOLT11 invoice string
   */
  sendPayment(invoice: string): Promise<{
    preimage: string;
    paymentHash?: string;
    route?: any;
  }>;

  /**
   * Create a Lightning invoice
   * @param args - Invoice parameters
   */
  makeInvoice(args: {
    amount?: number | string;
    defaultAmount?: number | string;
    minimumAmount?: number | string;
    maximumAmount?: number | string;
    defaultMemo?: string;
  }): Promise<{
    paymentRequest: string;
    paymentHash: string;
    rHash: string;
  }>;

  /**
   * Sign a message with the node's private key
   */
  signMessage(message: string): Promise<{
    message: string;
    signature: string;
  }>;

  /**
   * Verify a signed message
   */
  verifyMessage(signature: string, message: string): Promise<void>;

  /**
   * Request the user to send a keysend payment
   */
  keysend(args: {
    destination: string;
    amount: number | string;
    customRecords?: Record<string, string>;
  }): Promise<{
    preimage: string;
    paymentHash: string;
  }>;
}

declare global {
  interface Window {
    webln?: WebLNProvider;
  }
}

export {};
