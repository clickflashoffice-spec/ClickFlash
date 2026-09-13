import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DashboardView } from './DashboardView';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />
}));

vi.mock('../components/CeoAgentInsightsWidget', () => ({
  CeoAgentInsightsWidget: () => <div data-testid="ceo-widget" />
}));

describe('DashboardView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders correctly', () => {
    render(<DashboardView />);
    expect(screen.getByText('Executive Command Hub')).toBeInTheDocument();
    expect(screen.getByText('$15,850')).toBeInTheDocument();
    expect(screen.getByTestId('ceo-widget')).toBeInTheDocument();
  });

  it('handles dispatching a photographer', () => {
    render(<DashboardView />);
    
    const dispatchButtons = screen.getAllByText('AI Dispatch Reinforcements');
    expect(dispatchButtons.length).toBeGreaterThan(0);
    
    act(() => {
      fireEvent.click(dispatchButtons[0]);
    });
    
    expect(screen.getByText('Photographer Dispatched!')).toBeInTheDocument();
  });
});
