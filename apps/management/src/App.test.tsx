import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

vi.mock('./lib/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({ isAuthenticated: true, logout: vi.fn() }),
}));

vi.mock('./views/DashboardView', () => ({
  DashboardView: () => <div data-testid="dashboard-view">Dashboard</div>,
}));

describe('App', () => {
  it('renders the sidebar and default view', () => {
    render(<App />);
    expect(screen.getByText('ClickFlash CEO')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-view')).toBeInTheDocument();
  });
});
