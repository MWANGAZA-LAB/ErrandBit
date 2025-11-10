/**
 * Currency Service
 * Handles currency conversion and exchange rates
 * Uses exchangerate-api.com for real-time rates
 */

export type Currency = 'USD' | 'KSH' | 'BTC';

export interface ExchangeRates {
  USD: number;
  KSH: number;
  BTC: number;
  timestamp: number;
}

export interface CurrencyInfo {
  code: Currency;
  name: string;
  symbol: string;
  decimals: number;
}

export const CURRENCIES: Record<Currency, CurrencyInfo> = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    decimals: 2,
  },
  KSH: {
    code: 'KSH',
    name: 'Kenyan Shilling',
    symbol: 'KSh',
    decimals: 2,
  },
  BTC: {
    code: 'BTC',
    name: 'Bitcoin',
    symbol: '₿',
    decimals: 8,
  },
};

class CurrencyService {
  private rates: ExchangeRates | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,kes';

  /**
   * Fetch latest exchange rates from API (BTC as base)
   */
  async fetchRates(): Promise<ExchangeRates> {
    try {
      // Fetch BTC prices in USD and KES from CoinGecko
      const response = await fetch(this.COINGECKO_API);
      const data = await response.json();

      const btcToUsd = data.bitcoin?.usd || 65000; // BTC price in USD
      const btcToKes = data.bitcoin?.kes || 9750000; // BTC price in KES

      // Calculate rates with BTC as base (1 BTC = X currency)
      this.rates = {
        BTC: 1, // Base currency
        USD: btcToUsd, // How many USD per 1 BTC
        KSH: btcToKes, // How many KSH per 1 BTC
        timestamp: Date.now(),
      };

      this.lastFetch = Date.now();
      
      // Store in localStorage for offline use
      localStorage.setItem('exchangeRates', JSON.stringify(this.rates));
      
      return this.rates;
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
      
      // Try to use cached rates from localStorage
      const cached = localStorage.getItem('exchangeRates');
      if (cached) {
        this.rates = JSON.parse(cached);
        return this.rates!;
      }

      // Fallback to default rates (approximate values)
      this.rates = {
        BTC: 1, // Base currency
        USD: 65000, // ~$65,000 per BTC
        KSH: 9750000, // ~9.75M KES per BTC
        timestamp: Date.now(),
      };
      
      return this.rates;
    }
  }

  /**
   * Get current exchange rates (with caching)
   */
  async getRates(): Promise<ExchangeRates> {
    const now = Date.now();
    
    // Return cached rates if still valid
    if (this.rates && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.rates;
    }

    // Fetch new rates
    return this.fetchRates();
  }

  /**
   * Convert amount from one currency to another
   * BTC is the base currency, so rates represent: 1 BTC = X currency
   */
  async convert(amount: number, from: Currency, to: Currency): Promise<number> {
    if (from === to) return amount;

    const rates = await this.getRates();

    // Convert to BTC first (base currency)
    // If from=USD and amount=65000, then amountInBTC = 65000 / 65000 = 1 BTC
    const amountInBTC = amount / rates[from];
    
    // Convert from BTC to target currency
    // If to=KSH and amountInBTC=1, then result = 1 * 9750000 = 9750000 KSH
    const convertedAmount = amountInBTC * rates[to];

    return convertedAmount;
  }

  /**
   * Convert amount to USD cents (for backend storage)
   */
  async toCents(amount: number, currency: Currency): Promise<number> {
    const amountInUSD = await this.convert(amount, currency, 'USD');
    return Math.round(amountInUSD * 100);
  }

  /**
   * Convert USD cents to specified currency
   */
  async fromCents(cents: number, currency: Currency): Promise<number> {
    const amountInUSD = cents / 100;
    return this.convert(amountInUSD, 'USD', currency);
  }

  /**
   * Format amount with currency symbol
   */
  format(amount: number, currency: Currency): string {
    const info = CURRENCIES[currency];
    const formatted = amount.toFixed(info.decimals);
    
    // Format with thousands separator
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    return `${info.symbol}${parts.join('.')}`;
  }

  /**
   * Get currency info
   */
  getCurrencyInfo(currency: Currency): CurrencyInfo {
    return CURRENCIES[currency];
  }

  /**
   * Get all supported currencies
   */
  getSupportedCurrencies(): CurrencyInfo[] {
    return Object.values(CURRENCIES);
  }

  /**
   * Force refresh exchange rates
   */
  async refresh(): Promise<ExchangeRates> {
    this.lastFetch = 0; // Invalidate cache
    return this.fetchRates();
  }
}

export const currencyService = new CurrencyService();
