'use client';

import * as React from 'react';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD' | 'CHF' | 'CNY' | 'SEK' | 'NZD';

export interface CurrencyProviderProps {
  children: React.ReactNode;
  defaultCurrency?: Currency;
}

export interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

const CurrencyContext = React.createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children, defaultCurrency = 'USD' }: CurrencyProviderProps) {
  const [currency, setCurrency] = React.useState<Currency>(defaultCurrency);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => {
  const context = React.useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
