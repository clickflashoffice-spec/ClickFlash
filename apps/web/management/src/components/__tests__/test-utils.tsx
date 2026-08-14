import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { CurrencyProvider } from '../CurrencyContext';

/**
 * Custom render function that wraps components with necessary providers
 */
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return (
        <CurrencyProvider>
            {children}
        </CurrencyProvider>
    );
};

const customRender = (
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };

