/**
 * Payment Service
 * Handles Lightning payment operations
 */

import axios from 'axios';
import { authService } from './auth.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface LightningInvoice {
  payment_hash: string;
  payment_request: string;
  amount_sats: number;
  amount_usd: number;
  expires_at: string;
}

export interface PaymentStatus {
  payment_hash: string;
  paid: boolean;
  amount_sats: number;
  paid_at?: Date;
}

export interface ConversionRate {
  btc_usd: number;
  timestamp: string;
}

class PaymentService {
  private getHeaders() {
    const token = authService.getToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async createInvoice(jobId: string, amountUsd: number): Promise<LightningInvoice> {
    const response = await axios.post(
      `${API_URL}/payments/create-invoice`,
      { job_id: jobId, amount_usd: amountUsd },
      { headers: this.getHeaders() }
    );
    return response.data.invoice;
  }

  async getPaymentStatus(paymentHash: string): Promise<PaymentStatus> {
    const response = await axios.get(
      `${API_URL}/payments/${paymentHash}/status`,
      { headers: this.getHeaders() }
    );
    return response.data.status;
  }

  async getPaymentByHash(paymentHash: string): Promise<any> {
    const response = await axios.get(
      `${API_URL}/payments/${paymentHash}`,
      { headers: this.getHeaders() }
    );
    return response.data.payment;
  }

  async getPaymentsByJob(jobId: string): Promise<any[]> {
    const response = await axios.get(
      `${API_URL}/payments/job/${jobId}`,
      { headers: this.getHeaders() }
    );
    return response.data.payments;
  }

  async getBtcUsdRate(): Promise<ConversionRate> {
    const response = await axios.get(
      `${API_URL}/payments/rates/btc-usd`,
      { headers: this.getHeaders() }
    );
    return response.data.rate;
  }

  async convertUsdToSats(amountUsd: number): Promise<number> {
    const response = await axios.post(
      `${API_URL}/payments/convert`,
      { amount_usd: amountUsd, to: 'sats' },
      { headers: this.getHeaders() }
    );
    return response.data.amount_sats;
  }

  async convertSatsToUsd(amountSats: number): Promise<number> {
    const response = await axios.post(
      `${API_URL}/payments/convert`,
      { amount_sats: amountSats, to: 'usd' },
      { headers: this.getHeaders() }
    );
    return response.data.amount_usd;
  }
}

export const paymentService = new PaymentService();
