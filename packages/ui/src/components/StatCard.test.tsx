// @vitest-environment jsdom
import '@testing-library/jest-dom';
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { StatCard } from './StatCard';

describe('StatCard Component', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders title, value, and change rate', () => {
    render(<StatCard title="Total Revenue" value="$48,250" change={14.8} changeLabel="vs yesterday" />);
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('$48,250')).toBeInTheDocument();
    expect(screen.getByText('+14.8%')).toBeInTheDocument();
    expect(screen.getByText('vs yesterday')).toBeInTheDocument();
  });

  it('renders negative change with rose color styling', () => {
    render(<StatCard title="Abandonment Rate" value="12%" change={-3.2} />);
    const changeEl = screen.getByText('-3.2%');
    expect(changeEl.className).toContain('text-rose-400');
  });
});
