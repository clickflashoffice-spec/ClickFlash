import React, { createContext, useState, useEffect, useContext, ReactNode, useMemo, useCallback } from 'react';
import { AVAILABLE_CURRENCIES, BASE_CURRENCY } from '../constants.ts';
import { Currency } from '../types.ts';

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
    return localStorage.getItem('currencyCode') || BASE_CURRENCY.code;
  });

  const availableCurrencies = AVAILABLE_CURRENCIES;
  const baseCurrency = BASE_CURRENCY;

  const currency = useMemo(() => {
    return availableCurrencies.find(c => c.code === currencyCode) || baseCurrency;
  }, [currencyCode, availableCurrencies, baseCurrency]);

  useEffect(() => {
    localStorage.setItem('currencyCode', currency.code);
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
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};