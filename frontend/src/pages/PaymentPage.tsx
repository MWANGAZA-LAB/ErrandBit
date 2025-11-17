/**
 * Payment Page
 * Display Lightning invoice and handle payment with multi-wallet support
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { jobService, Job } from '../services/job.service';

import { formatCentsAsUsd } from '../utils/currency';
import UniversalPayment from '../components/UniversalPayment';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [job, setJob] = useState<Job | null>(null);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Helper to get auth token
  const getAuthToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('auth_token');
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (id) {
      loadJob();
    }
  }, [id, isAuthenticated, navigate]);

  const loadJob = async () => {
    if (!id) return;
    
    setLoading(true);
    setError('');

    try {
      const data = await jobService.getJobById(id);
      setJob(data);

      // Check if job is in correct status
      if (data.status !== 'completed' && data.status !== 'awaiting_payment') {
        setError('Job must be completed before payment');
        return;
      }

      // Check if user is the client
      if (data.clientId !== Number(user?.id)) {
        setError('Only the job client can make payment');
        return;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load job');
    } finally {
      setLoading(false);
    }
  };

  const createInvoice = async () => {
    if (!id || !job) return;

    setCreating(true);
    setError('');

    try {
      // Convert cents to sats (rough conversion: 1 USD = 2000 sats)
      const amountSats = Math.floor((job.priceCents / 100) * 2000);
      
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/api/payments/create-invoice-multi-wallet`,
        {
          jobId: Number(id),
          amountSats
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      setInvoice(response.data.invoice);
      setShowPayment(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create invoice');
    } finally {
      setCreating(false);
    }
  };

  const handlePaymentSuccess = async (preimage: string, method: string) => {
    if (!invoice || !id) return;

    try {
      const token = getAuthToken();
      await axios.post(
        `${API_URL}/api/payments/verify-multi-wallet`,
        {
          jobId: Number(id),
          paymentHash: invoice.paymentHash,
          proof: preimage,
          method,
          amountSats: invoice.amountSats
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Show success state
      setPaymentSuccess(true);
      setShowPayment(false);
      
      // Auto-redirect after 3 seconds
      setTimeout(() => {
        navigate(`/jobs/${id}`);
      }, 3000);
      
    } catch (err: any) {
      setError(err.response?.data?.error || 'Payment verification failed');
      setShowPayment(false);
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

  // Payment Success Screen
  if (paymentSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-8 text-center">
          <div className="mb-4">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-green-900 mb-2">Payment Confirmed!</h2>
          <p className="text-green-700 mb-6">
            Your payment has been successfully verified on the Lightning Network.
          </p>
          <div className="bg-white dark:bg-gray-700 rounded-md p-4 mb-6 transition-colors">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Transaction Details:</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">
              Payment Hash: {invoice?.paymentHash?.substring(0, 32)}...
            </p>
            <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-2">
              Amount: {invoice?.amountSats?.toLocaleString()} sats
            </p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Redirecting you back to the job in 3 seconds...
          </p>
          <button
            onClick={() => navigate(`/jobs/${id}`)}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            View Job Now
          </button>
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
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pay with Lightning</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{job.title}</p>
      </div>

      {/* Job Summary */}
      <div className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50 rounded-lg p-4 sm:p-6 mb-6 transition-colors">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Payment Summary</h2>
        
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-[280px] px-4 sm:px-0 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Job:</span>
              <span className="font-medium text-gray-900 dark:text-white truncate ml-2 max-w-[60%]">{job.title}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Amount:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCentsAsUsd(job.priceCents)}
              </span>
            </div>
            
            {invoice && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Amount (sats):</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {invoice.amountSats.toLocaleString()} sats
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Generate Invoice Button */}
      {!invoice && (
        <div className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50 rounded-lg p-6 transition-colors">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Click the button below to generate a Lightning invoice and choose your payment method.
          </p>
          
          <button
            onClick={createInvoice}
            disabled={creating}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
          >
            {creating ? 'Creating Invoice...' : 'Generate Lightning Invoice'}
          </button>
        </div>
      )}

      {/* Universal Payment Modal */}
      {showPayment && invoice && (
        <UniversalPayment
          invoice={invoice.paymentRequest}
          paymentHash={invoice.paymentHash}
          amount={invoice.amountSats}
          jobId={Number(id)}
          onSuccess={handlePaymentSuccess}
          onCancel={() => {
            setShowPayment(false);
            setInvoice(null);
          }}
        />
      )}

      {/* Instructions */}
      <div className="mt-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-6 transition-colors">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Multiple Payment Methods Supported:</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <li><strong>WebLN:</strong> One-click payment with browser wallets (Alby, Zeus, Mutiny)</li>
          <li><strong>QR Code:</strong> Scan with mobile wallets (Phoenix, BlueWallet, Breez)</li>
          <li><strong>Manual:</strong> Paste invoice in your wallet, then submit preimage proof</li>
          <li><strong>Upload:</strong> Take a screenshot of payment confirmation for verification</li>
        </ul>
      </div>
    </div>
  );
}
