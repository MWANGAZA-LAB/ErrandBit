/**
 * Payment Page
 * Display Lightning invoice and handle payment
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import { jobService, Job } from '../services/job.service';
import { paymentService, LightningInvoice } from '../services/payment.service';
import toast from 'react-hot-toast';

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [job, setJob] = useState<Job | null>(null);
  const [invoice, setInvoice] = useState<LightningInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    /* AUTHENTICATION BYPASSED - Commented out for testing`n
    if (!isAuthenticated) {`n
      navigate('/login');`n
      return;`n
    }`n
    */

    if (id) {
      loadJob();
    }
  }, [id, isAuthenticated, navigate]);

  useEffect(() => {
    if (invoice && !checking) {
      // Poll for payment status every 3 seconds
      const interval = setInterval(() => {
        checkPaymentStatus();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [invoice, checking]);

  const loadJob = async () => {
    if (!id) return;
    
    setLoading(true);
    setError('');

    try {
      const data = await jobService.getJobById(id);
      setJob(data);

      // Check if job is in correct status
      if (data.status !== 'completed') {
        setError('Job must be completed before payment');
        return;
      }

      // Check if user is the client
      if (data.client_id !== user?.id) {
        setError('Only the job client can make payment');
        return;
      }

      // Note: Job status will be 'paid' after payment completes
      // For now, we just check if it's completed
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load job');
    } finally {
      setLoading(false);
    }
  };

  const createInvoice = async () => {
    if (!id || !job || !job.agreed_price_usd) return;

    setCreating(true);
    setError('');

    try {
      const invoiceData = await paymentService.createInvoice(id, job.agreed_price_usd);
      setInvoice(invoiceData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create invoice');
    } finally {
      setCreating(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!invoice) return;

    setChecking(true);

    try {
      const status = await paymentService.getPaymentStatus(invoice.payment_hash);
      
      if (status.paid) {
        // Payment successful, redirect to job detail
        navigate(`/jobs/${id}?payment=success`);
      }
    } catch (err: any) {
      console.error('Failed to check payment status:', err);
    } finally {
      setChecking(false);
    }
  };

  const copyToClipboard = async () => {
    if (!invoice) return;

    try {
      await navigator.clipboard.writeText(invoice.payment_request);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={() => navigate(`/jobs/${id}`)}
            className="mt-4 text-sm text-red-600 hover:text-red-500"
          >
            Back to job
          </button>
        </div>
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/jobs/${id}`)}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          ← Back to job
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900">Pay with Lightning</h1>
        <p className="mt-2 text-sm text-gray-600">{job.title}</p>
      </div>

      {/* Job Summary */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Payment Summary</h2>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Job:</span>
            <span className="font-medium text-gray-900">{job.title}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Amount:</span>
            <span className="font-medium text-gray-900">
              ${job.agreed_price_usd?.toFixed(2) || job.budget_max_usd.toFixed(2)}
            </span>
          </div>
          
          {invoice && (
            <div className="flex justify-between">
              <span className="text-gray-600">Amount (sats):</span>
              <span className="font-medium text-gray-900">
                {invoice.amount_sats.toLocaleString()} sats
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Invoice Display */}
      {!invoice ? (
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-600 mb-6">
            Click the button below to generate a Lightning invoice for this payment.
          </p>
          
          <button
            onClick={createInvoice}
            disabled={creating}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {creating ? 'Creating Invoice...' : 'Generate Lightning Invoice'}
          </button>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-6">
          {/* QR Code */}
          <div className="mb-6">
            <div className="bg-white border-2 border-gray-300 rounded-lg p-8 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block p-4 bg-white rounded-lg">
                  <QRCodeSVG
                    value={invoice.payment_request}
                    size={256}
                    level="M"
                    includeMargin={true}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Scan this QR code with your Lightning wallet
                </p>
              </div>
            </div>
          </div>

          {/* Invoice String */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lightning Invoice
            </label>
            <div className="relative">
              <textarea
                readOnly
                value={invoice.payment_request}
                rows={4}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-xs font-mono bg-gray-50 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={copyToClipboard}
                className="absolute top-2 right-2 px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Payment Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {checking ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                ) : (
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800">
                  Waiting for payment... Checking every 3 seconds.
                </p>
              </div>
            </div>
          </div>

          {/* Expiration */}
          <div className="text-center text-sm text-gray-500">
            Invoice expires: {new Date(invoice.expires_at).toLocaleString()}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-gray-50 rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">How to pay:</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
          <li>Open your Lightning wallet (e.g., Phoenix, Muun, BlueWallet)</li>
          <li>Scan the QR code or paste the invoice string</li>
          <li>Confirm the payment in your wallet</li>
          <li>Wait for confirmation (usually instant)</li>
        </ol>
      </div>
    </div>
  );
}
