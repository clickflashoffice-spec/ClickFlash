import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CurrencyProvider } from '../CurrencyContext';
import { ThemeProvider } from '../ThemeContext';

/**
 * Custom render function that wraps components with necessary providers
 */
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: Infinity,
                staleTime: Infinity,
                refetchOnWindowFocus: false,
                refetchOnMount: false,
            },
        },
    });
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <CurrencyProvider>
                    {children}
                </CurrencyProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
};

const customRender = (
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>,
) => {
    const user = userEvent.setup();
    return {
        user,
        ...render(ui, { wrapper: AllTheProviders, ...options }),
    };
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };
