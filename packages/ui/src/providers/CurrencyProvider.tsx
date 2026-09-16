'use client';

import * as React from 'react';
import { internal } from '@clickflash/errors';

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

  const value = React.useMemo(() => ({ currency, setCurrency }), [currency]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => {
  const context = React.useContext(CurrencyContext);
  if (context === undefined) {
    throw internal('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
