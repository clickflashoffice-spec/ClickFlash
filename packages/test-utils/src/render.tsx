import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import React from 'react';

interface AllProvidersProps {
  children: React.ReactNode;
}

export function AllProviders({ children }: AllProvidersProps): React.ReactElement {
  return React.createElement(React.Fragment, null, children);
}

export function customRender(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
export { customRender as render };
