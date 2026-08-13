import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AIDemandForecasting from '../AIDemandForecasting';

// Mock Recharts
vi.mock('recharts', () => {
  const Original = vi.importActual('recharts');
  return {
    ...Original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    AreaChart: ({ children }: any) => <div data-testid="recharts-areachart">{children}</div>,
    Area: () => <div data-testid="recharts-area" />,
    LineChart: ({ children }: any) => <div data-testid="recharts-linechart">{children}</div>,
    Line: () => <div data-testid="recharts-line" />,
    XAxis: () => <div data-testid="recharts-xaxis" />,
    YAxis: () => <div data-testid="recharts-yaxis" />,
    CartesianGrid: () => <div data-testid="recharts-grid" />,
    Tooltip: () => <div data-testid="recharts-tooltip" />,
    Legend: () => <div data-testid="recharts-legend" />,
  };
});

describe('AIDemandForecasting', () => {
  it('renders with title', () => {
    render(<AIDemandForecasting />);
    expect(screen.getByText('90-Day Demand & Revenue Forecast')).toBeTruthy();
  });

  it('renders chart with forecast data after load', () => {
    render(<AIDemandForecasting />);
    expect(screen.getByTestId('recharts-areachart')).toBeTruthy();
  });

  it('renders staffing recommendations', () => {
    render(<AIDemandForecasting />);
    expect(screen.getByText('AI Staffing Recommendations')).toBeTruthy();
    expect(screen.getByText('Next Week')).toBeTruthy();
    expect(screen.getByText('In 2 Weeks')).toBeTruthy();
  });

  it('renders weather & seasonality impact', () => {
    render(<AIDemandForecasting />);
    expect(screen.getByText('Weather & Seasonality Impact')).toBeTruthy();
    expect(screen.getByText('Summer Peak Effect')).toBeTruthy();
    expect(screen.getByText('Rain Risk (Days 45-60)')).toBeTruthy();
  });
});
