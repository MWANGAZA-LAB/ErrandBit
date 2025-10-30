/**
 * Fedi Payment Service
 * Handles WebLN integration for seamless Lightning payments within Fedi app
 */

import type { WebLNProvider } from '../types/webln';

export interface PaymentResult {
  success: boolean;
  preimage?: string;
  paymentHash?: string;
  error?: string;
}

export interface InvoiceRequest {
  amount: number; // in satoshis
  memo: string;
}

export class FediPaymentService {
  private webln: WebLNProvider | null = null;
  private isEnabled: boolean = false;

  /**
   * Check if WebLN is available (running in Fedi app)
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.webln;
  }

  /**
   * Initialize WebLN connection
   */
  async initialize(): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('WebLN not available - not running in Fedi app');
      return false;
    }

    try {
      await window.webln!.enable();
      this.webln = window.webln!;
      this.isEnabled = true;
      console.log('WebLN enabled successfully');
      return true;
    } catch (error) {
      console.error('Failed to enable WebLN:', error);
      return false;
    }
  }

  /**
   * Get WebLN provider information
   */
  async getInfo() {
    if (!this.webln) {
      throw new Error('WebLN not initialized');
    }

    try {
      return await this.webln.getInfo();
    } catch (error) {
      console.error('Failed to get WebLN info:', error);
      return null;
    }
  }

  /**
   * Pay a Lightning invoice
   * Used by clients to pay runners for completed errands
   */
  async sendPayment(invoice: string): Promise<PaymentResult> {
    if (!this.webln) {
      return {
        success: false,
        error: 'WebLN not initialized. Please ensure you are running in Fedi app.',
      };
    }

    try {
      const result = await this.webln.sendPayment(invoice);
      console.log('Payment successful:', result.preimage);
      
      return {
        success: true,
        preimage: result.preimage,
        paymentHash: result.paymentHash,
      };
    } catch (error: any) {
      console.error('Payment failed:', error);
      return {
        success: false,
        error: error.message || 'Payment failed',
      };
    }
  }

  /**
   * Create a Lightning invoice
   * Used by runners to receive payment for their services
   */
  async createInvoice(request: InvoiceRequest): Promise<string | null> {
    if (!this.webln) {
      throw new Error('WebLN not initialized');
    }

    try {
      const result = await this.webln.makeInvoice({
        amount: request.amount,
        defaultMemo: request.memo,
      });
      
      return result.paymentRequest;
    } catch (error) {
      console.error('Failed to create invoice:', error);
      return null;
    }
  }

  /**
   * Pay for an errand (main payment flow)
   * Includes optional platform fee
   */
  async payForErrand(
    runnerInvoice: string,
    amount: number,
    platformFeeInvoice?: string
  ): Promise<PaymentResult> {
    // Pay runner first
    const runnerPayment = await this.sendPayment(runnerInvoice);
    
    if (!runnerPayment.success) {
      return runnerPayment;
    }

    // If platform fee invoice provided, pay it
    if (platformFeeInvoice) {
      const feePayment = await this.sendPayment(platformFeeInvoice);
      
      if (!feePayment.success) {
        console.warn('Platform fee payment failed:', feePayment.error);
        // Don't fail the whole transaction if fee payment fails
      }
    }

    return runnerPayment;
  }

  /**
   * Collect platform subscription fee
   * For runner Pro subscriptions (5,000 sats/month)
   */
  async collectSubscriptionFee(invoice: string): Promise<PaymentResult> {
    return this.sendPayment(invoice);
  }

  /**
   * Collect boost listing fee
   * For featured runner placement (10,000 sats)
   */
  async collectBoostFee(invoice: string): Promise<PaymentResult> {
    return this.sendPayment(invoice);
  }

  /**
   * Sign a message using WebLN
   * Can be used for authentication or verification
   */
  async signMessage(message: string): Promise<{ signature: string } | null> {
    if (!this.webln) {
      throw new Error('WebLN not initialized');
    }

    try {
      const result = await this.webln.signMessage(message);
      return { signature: result.signature };
    } catch (error) {
      console.error('Failed to sign message:', error);
      return null;
    }
  }

  /**
   * Check if WebLN is enabled
   */
  get enabled(): boolean {
    return this.isEnabled;
  }
}

// Singleton instance
export const fediPaymentService = new FediPaymentService();
