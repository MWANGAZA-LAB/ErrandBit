/**
 * Universal Payment Component
 * Supports multiple Lightning payment methods:
 * - WebLN (browser wallets like Alby, Zeus)
 * - QR Code (mobile wallets)
 * - Manual Invoice Entry
 * - Screenshot Upload
 */

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface PaymentProps {
  invoice: string;
  paymentHash: string;
  amount: number;
  jobId: number;
  onSuccess: (preimage: string, method: PaymentMethod) => void;
  onCancel: () => void;
}

type PaymentMethod = 'webln' | 'qr' | 'manual' | 'upload';

export default function UniversalPayment({ 
  invoice, 
  paymentHash,
  amount, 
  jobId,
  onSuccess, 
  onCancel 
}: PaymentProps) {
  const [method, setMethod] = useState<PaymentMethod>('qr');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [hasWebLN, setHasWebLN] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [manualProof, setManualProof] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check WebLN availability
    const weblnAvailable = typeof window.webln !== 'undefined';
    setHasWebLN(weblnAvailable);
    
    // Set default method based on WebLN availability
    if (weblnAvailable) {
      setMethod('webln');
    }

    // Generate QR code
    QRCode.toDataURL(invoice.toUpperCase(), {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    }).then(setQrDataUrl).catch(err => {
      console.error('QR generation error:', err);
      setError('Failed to generate QR code');
    });
  }, [invoice]);

  const handleWebLNPayment = async () => {
    if (!window.webln) {
      setError('WebLN is not available');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      await window.webln.enable();
      const result = await window.webln.sendPayment(invoice);
      onSuccess(result.preimage, 'webln');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setError(message);
    } finally {
      setProcessing(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setUploadedImage(result);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitUpload = () => {
    if (!uploadedImage) {
      setError('Please upload an image');
      return;
    }
    onSuccess(uploadedImage, 'upload');
  };

  const handleSubmitManual = () => {
    if (!manualProof || manualProof.trim().length === 0) {
      setError('Please enter payment proof');
      return;
    }

    // Validate preimage format (64 hex characters)
    if (!/^[a-fA-F0-9]{64}$/.test(manualProof.trim())) {
      setError('Invalid preimage format. Must be 64 hexadecimal characters.');
      return;
    }

    onSuccess(manualProof.trim(), 'manual');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(invoice).then(() => {
      // Could add a toast notification here
      alert('Invoice copied to clipboard!');
    }).catch(() => {
      setError('Failed to copy to clipboard');
    });
  };

  const formatSats = (sats: number) => {
    return sats.toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-2">Pay with Lightning</h2>
        <p className="text-gray-600 mb-6">Amount: <span className="font-semibold text-orange-600">{formatSats(amount)} sats</span></p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Payment Method Tabs */}
        <div className="flex gap-2 mb-6 border-b overflow-x-auto">
          {hasWebLN && (
            <button
              onClick={() => {
                setMethod('webln');
                setError(null);
              }}
              className={`px-4 py-2 font-medium whitespace-nowrap ${
                method === 'webln'
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Browser Wallet
            </button>
          )}
          <button
            onClick={() => {
              setMethod('qr');
              setError(null);
            }}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              method === 'qr'
                ? 'border-b-2 border-orange-500 text-orange-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📱 QR Code
          </button>
          <button
            onClick={() => {
              setMethod('manual');
              setError(null);
            }}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              method === 'manual'
                ? 'border-b-2 border-orange-500 text-orange-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            ✏️ Manual
          </button>
          <button
            onClick={() => {
              setMethod('upload');
              setError(null);
            }}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              method === 'upload'
                ? 'border-b-2 border-orange-500 text-orange-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📸 Upload
          </button>
        </div>

        {/* WebLN Method */}
        {method === 'webln' && hasWebLN && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                Pay instantly with your browser wallet (Alby, Zeus, Mutiny, etc.)
              </p>
            </div>
            <button
              onClick={handleWebLNPayment}
              disabled={processing}
              className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {processing ? 'Processing Payment...' : 'Pay Now'}
            </button>
          </div>
        )}

        {/* QR Code Method */}
        {method === 'qr' && (
          <div className="space-y-4">
            <div className="bg-white border-2 border-gray-200 rounded-lg p-4 flex justify-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Payment QR Code" className="w-64 h-64" />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-gray-400">
                  Generating QR code...
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 text-center">
              Scan with any Lightning wallet app (BlueWallet, Phoenix, Breez, etc.)
            </p>
            <button
              onClick={copyToClipboard}
              className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition"
            >
              Copy Invoice String
            </button>
            <div className="text-xs text-gray-500 text-center pt-2">
              After paying, the payment will be automatically detected
            </div>
          </div>
        )}

        {/* Upload QR Method */}
        {method === 'upload' && (
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-800">
                Upload a payment confirmation screenshot from your wallet
              </p>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="payment-proof-upload"
              />
              <label 
                htmlFor="payment-proof-upload"
                className="cursor-pointer block"
              >
                <div className="text-gray-600 mb-2">
                  {uploadedImage ? 'Image uploaded' : 'Click to upload image'}
                </div>
                <div className="text-xs text-gray-500">
                  PNG, JPG, or WebP (max 5MB)
                </div>
              </label>
            </div>
            {uploadedImage && (
              <div className="space-y-2">
                <img src={uploadedImage} alt="Uploaded proof" className="w-full rounded-lg border" />
                <button
                  onClick={handleSubmitUpload}
                  className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 font-semibold transition"
                >
                  Submit Payment Proof
                </button>
                <p className="text-xs text-gray-500 text-center">
                  This will be manually verified by the runner
                </p>
              </div>
            )}
          </div>
        )}

        {/* Manual Method */}
        {method === 'manual' && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs font-mono break-all text-gray-600">{invoice}</p>
            </div>
            <button
              onClick={copyToClipboard}
              className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition"
            >
              Copy Full Invoice
            </button>
            <div className="border-t pt-4 space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                After paying, paste the payment preimage:
              </label>
              <input
                type="text"
                value={manualProof}
                onChange={(e) => {
                  setManualProof(e.target.value);
                  setError(null);
                }}
                placeholder="Enter 64-character hex preimage"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <button
                onClick={handleSubmitManual}
                disabled={!manualProof}
                className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition"
              >
                Verify Payment
              </button>
              <p className="text-xs text-gray-500 text-center">
                The preimage is cryptographic proof of payment
              </p>
            </div>
          </div>
        )}

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="w-full mt-6 text-gray-600 py-2 hover:text-gray-800 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
