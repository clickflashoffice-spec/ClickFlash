import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

/**
 * Custom render function that wraps components with necessary providers
 * Note: Context providers like CurrencyProvider and ThemeProvider are not included
 * here as they may be mocked in individual tests. Add them to specific tests as needed.
 */
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return (
        <>
            {children}
        </>
    );
};

const customRender = (
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Note: In @testing-library/react v16+, some utilities are moved or structured differently.
// Most core DOM utilities are re-exported from @testing-library/dom.
export * from '@testing-library/react';
export { within } from '@testing-library/react';
export { customRender as render };

