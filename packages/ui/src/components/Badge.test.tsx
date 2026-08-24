// @vitest-environment jsdom
import '@testing-library/jest-dom';
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge Component', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders badge with default styles and children', () => {
    render(<Badge>Operational</Badge>);
    const badge = screen.getByText('Operational');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-slate-800/80');
  });

  it('renders with success variant and dot', () => {
    const { container } = render(<Badge variant="success" dot>Online</Badge>);
    expect(screen.getByText('Online')).toBeInTheDocument();
    const dot = container.querySelector('.bg-emerald-400');
    expect(dot).toBeInTheDocument();
  });

  it('renders with cyber variant and pulse animation', () => {
    const { container } = render(<Badge variant="cyber" dot pulse>AI Active</Badge>);
    expect(screen.getByText('AI Active')).toBeInTheDocument();
    const pulseEl = container.querySelector('.animate-ping');
    expect(pulseEl).toBeInTheDocument();
  });
});
