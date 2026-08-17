import React, { createContext, useState, useEffect, useContext, ReactNode, useMemo, useCallback } from 'react';
import type { Currency } from '@clickflash/types';

export const BASE_CURRENCY: Currency = {
  id: 'USD',
  code: 'USD',
  name: 'US Dollar',
  symbol: '$',
  rate: 1.0,
};

export const AVAILABLE_CURRENCIES: Currency[] = [
  BASE_CURRENCY,
  { id: 'EUR', code: 'EUR', name: 'Euro', symbol: '€', rate: 0.92 },
  { id: 'GBP', code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.79 },
  { id: 'CAD', code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', rate: 1.36 },
  { id: 'AUD', code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rate: 1.52 },
];

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currencyCode: string) => void;
  availableCurrencies: Currency[];
  baseCurrency: Currency;
  formatCurrency: (amountInBase: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currencyCode, setCurrencyCode] = useState<string>(() => {
    try {
      return localStorage.getItem('currencyCode') || BASE_CURRENCY.code;
    } catch {
      return BASE_CURRENCY.code;
    }
  });

  const availableCurrencies = AVAILABLE_CURRENCIES;
  const baseCurrency = BASE_CURRENCY;

  const currency = useMemo(() => {
    return availableCurrencies.find(c => c.code === currencyCode) || baseCurrency;
  }, [currencyCode, availableCurrencies, baseCurrency]);

  useEffect(() => {
    try {
      localStorage.setItem('currencyCode', currency.code);
    } catch {}
  }, [currency]);

  const setCurrency = useCallback((newCode: string) => {
    if (availableCurrencies.some(c => c.code === newCode)) {
      setCurrencyCode(newCode);
    }
  }, [availableCurrencies]);

  const formatCurrency = useCallback((amountInBase: number): string => {
    const convertedAmount = amountInBase * currency.rate;
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.code,
    }).format(convertedAmount);
  }, [currency]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, availableCurrencies, baseCurrency, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    return {
      currency: BASE_CURRENCY,
      setCurrency: () => {},
      availableCurrencies: AVAILABLE_CURRENCIES,
      baseCurrency: BASE_CURRENCY,
      formatCurrency: (amount: number) => `$${amount.toFixed(2)}`
    };
  }
  return context;
};

export default CurrencyContext;
