/**
 * Payment Service
 * Handles Lightning payment operations
 */

import axios from 'axios';
import { simpleAuthService } from './simple-auth.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const API_BASE = `${API_URL}/api`;

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
    const token = simpleAuthService.getToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async createInvoice(jobId: number | string, amountSats: number): Promise<LightningInvoice> {
    const response = await axios.post(
      `${API_BASE}/payments`,
      { jobId, amountSats },
      { headers: this.getHeaders() }
    );
    return response.data.data || response.data.invoice;
  }

  async getPaymentStatus(paymentHash: string): Promise<PaymentStatus> {
    const response = await axios.get(
      `${API_BASE}/payments/hash/${paymentHash}`,
      { headers: this.getHeaders() }
    );
    return response.data.data || response.data.status;
  }

  async getPaymentByHash(paymentHash: string): Promise<any> {
    const response = await axios.get(
      `${API_BASE}/payments/hash/${paymentHash}`,
      { headers: this.getHeaders() }
    );
    return response.data.data || response.data.payment;
  }

  async getPaymentsByJob(jobId: number | string): Promise<any[]> {
    const response = await axios.get(
      `${API_BASE}/payments/job/${jobId}`,
      { headers: this.getHeaders() }
    );
    return response.data.data || response.data.payments || [];
  }

  async getBtcUsdRate(): Promise<ConversionRate> {
    // This endpoint may not exist in new API - implement if needed
    const response = await axios.get(
      `${API_BASE}/payments/stats`,
      { headers: this.getHeaders() }
    );
    return response.data.rate || { btc_usd: 50000, timestamp: new Date().toISOString() };
  }

  async convertUsdToSats(amountUsd: number): Promise<number> {
    // Simple conversion - 1 USD = ~2000 sats (adjust based on current rate)
    const rate = await this.getBtcUsdRate();
    return Math.round((amountUsd / rate.btc_usd) * 100000000);
  }

  async convertSatsToUsd(amountSats: number): Promise<number> {
    // Simple conversion
    const rate = await this.getBtcUsdRate();
    return (amountSats / 100000000) * rate.btc_usd;
  }
}

export const paymentService = new PaymentService();
