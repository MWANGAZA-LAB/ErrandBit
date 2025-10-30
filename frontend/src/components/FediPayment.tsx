/**
 * Fedi Payment Component
 * Handles Lightning payments via WebLN for completed errands
 */

import React, { useState } from 'react';
import { useFedi } from '../hooks/useFedi';

interface FediPaymentProps {
  errandId: string;
  runnerName: string;
  amount: number; // in satoshis
  runnerInvoice: string;
  platformFeeInvoice?: string;
  onPaymentSuccess: (preimage: string) => void;
  onPaymentError: (error: string) => void;
}

export function FediPayment({
  errandId,
  runnerName,
  amount,
  runnerInvoice,
  platformFeeInvoice,
  onPaymentSuccess,
  onPaymentError,
}: FediPaymentProps) {
  const { weblnEnabled, paymentService } = useFedi();
  const [isPaying, setIsPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const handlePayment = async () => {
    if (!weblnEnabled) {
      onPaymentError('WebLN not available. Please open in Fedi app.');
      return;
    }

    setIsPaying(true);
    setPaymentStatus('processing');

    try {
      const result = await paymentService.payForErrand(
        runnerInvoice,
        amount,
        platformFeeInvoice
      );

      if (result.success && result.preimage) {
        setPaymentStatus('success');
        onPaymentSuccess(result.preimage);
      } else {
        setPaymentStatus('error');
        onPaymentError(result.error || 'Payment failed');
      }
    } catch (error: any) {
      setPaymentStatus('error');
      onPaymentError(error.message || 'Payment failed');
    } finally {
      setIsPaying(false);
    }
  };

  if (!weblnEnabled) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-yellow-800">WebLN Not Available</p>
            <p className="text-sm text-yellow-700 mt-1">
              Please open ErrandBit in the Fedi app to make instant Lightning payments.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Runner:</span>
            <span className="font-medium text-gray-900">{runnerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Amount:</span>
            <span className="font-medium text-gray-900">{amount.toLocaleString()} sats</span>
          </div>
          {platformFeeInvoice && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Platform fee:</span>
              <span className="text-gray-500">500 sats</span>
            </div>
          )}
        </div>
      </div>

      {paymentStatus === 'success' && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-green-800">Payment successful!</span>
          </div>
        </div>
      )}

      {paymentStatus === 'error' && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-red-800">Payment failed. Please try again.</span>
          </div>
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={isPaying || paymentStatus === 'success'}
        className={`w-full flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-colors ${
          isPaying || paymentStatus === 'success'
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-primary text-white hover:bg-orange-600'
        }`}
      >
        {isPaying ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </>
        ) : paymentStatus === 'success' ? (
          <>
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Paid
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
            Pay {amount.toLocaleString()} sats
          </>
        )}
      </button>

      <p className="text-xs text-gray-500 text-center mt-3">
        Payment will be sent instantly from your Fedi balance
      </p>
    </div>
  );
}
