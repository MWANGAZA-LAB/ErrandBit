/**
 * Currency Input Component
 * Input field with currency selector dropdown and real-time conversion
 */

import { useState, useEffect } from 'react';
import { currencyService, Currency, CURRENCIES, ExchangeRates } from '../services/currency.service';
import toast from 'react-hot-toast';

interface CurrencyInputProps {
  value: number; // Value in USD cents (for backend)
  onChange: (cents: number) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function CurrencyInput({
  value,
  onChange,
  label = 'Job Price',
  required = false,
  disabled = false,
}: CurrencyInputProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('USD');
  const [displayAmount, setDisplayAmount] = useState<string>('');
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Load exchange rates on mount
  useEffect(() => {
    loadRates();
  }, []);

  // Update display amount when value or currency changes
  useEffect(() => {
    if (rates) {
      if (value > 0) {
        convertFromCents(value, selectedCurrency);
      } else {
        setDisplayAmount('');
      }
    }
  }, [value, selectedCurrency, rates]);

  const loadRates = async () => {
    try {
      setLoading(true);
      const fetchedRates = await currencyService.getRates();
      setRates(fetchedRates);
      setLastUpdate(new Date(fetchedRates.timestamp));
    } catch (error) {
      console.error('Failed to load exchange rates:', error);
      toast.error('Failed to load exchange rates');
    } finally {
      setLoading(false);
    }
  };

  const convertFromCents = async (cents: number, currency: Currency) => {
    try {
      const amount = await currencyService.fromCents(cents, currency);
      setDisplayAmount(amount.toFixed(CURRENCIES[currency].decimals));
    } catch (error) {
      console.error('Conversion error:', error);
    }
  };

  const handleAmountChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayAmount(inputValue);

    // Convert to USD cents for backend
    const amount = parseFloat(inputValue);
    if (!isNaN(amount) && amount >= 0) {
      try {
        const cents = await currencyService.toCents(amount, selectedCurrency);
        console.log(`Converting ${amount} ${selectedCurrency} to ${cents} cents`); // Debug
        onChange(cents);
      } catch (error) {
        console.error('Conversion error:', error);
      }
    } else if (inputValue === '') {
      onChange(0);
    }
  };

  const handleCurrencyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurrency = e.target.value as Currency;
    setSelectedCurrency(newCurrency);

    // Convert current value to new currency
    if (value) {
      await convertFromCents(value, newCurrency);
    }
  };

  const handleRefreshRates = async () => {
    try {
      setLoading(true);
      const freshRates = await currencyService.refresh();
      setRates(freshRates);
      setLastUpdate(new Date(freshRates.timestamp));
      toast.success('Exchange rates updated');
      
      // Reconvert current value
      if (value) {
        await convertFromCents(value, selectedCurrency);
      }
    } catch (error) {
      toast.error('Failed to refresh rates');
    } finally {
      setLoading(false);
    }
  };

  const getConversionInfo = () => {
    if (!rates || !displayAmount || parseFloat(displayAmount) === 0) return null;

    const amount = parseFloat(displayAmount);
    const usdAmount = value / 100;

    if (selectedCurrency === 'USD') return null;

    return (
      <div className="mt-2 text-sm text-gray-600">
        ≈ {currencyService.format(usdAmount, 'USD')} USD
      </div>
    );
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="flex gap-2">
        {/* Amount Input */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">
              {CURRENCIES[selectedCurrency].symbol}
            </span>
          </div>
          <input
            type="number"
            value={displayAmount}
            onChange={handleAmountChange}
            disabled={disabled || loading}
            required={required}
            step={selectedCurrency === 'BTC' ? '0.00000001' : '0.01'}
            min="0"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="0.00"
          />
        </div>

        {/* Currency Selector */}
        <select
          value={selectedCurrency}
          onChange={handleCurrencyChange}
          disabled={disabled || loading}
          className="block w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {Object.values(CURRENCIES).map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.code}
            </option>
          ))}
        </select>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={handleRefreshRates}
          disabled={loading}
          className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Refresh exchange rates"
        >
          <svg
            className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Conversion Info */}
      {getConversionInfo()}

      {/* Exchange Rate Info */}
      {rates && lastUpdate && (
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <div>
            {selectedCurrency !== 'USD' && (
              <span>
                1 USD = {rates[selectedCurrency].toFixed(CURRENCIES[selectedCurrency].decimals)} {selectedCurrency}
              </span>
            )}
          </div>
          <div>
            Updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="mt-2 text-xs text-gray-500">
          Loading exchange rates...
        </div>
      )}
    </div>
  );
}
