import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ThemeToggle from '../ThemeToggle';
import * as ThemeContext from '../ThemeContext';

describe('ThemeToggle Component', () => {
  it('renders correctly and toggles theme', () => {
    const toggleThemeMock = jest.fn();
    
    jest.spyOn(ThemeContext, 'useTheme').mockReturnValue({
      theme: 'light',
      toggleTheme: toggleThemeMock
    });

    render(<ThemeToggle />);
    
    const button = screen.getByRole('button', { name: /toggle theme/i });
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(toggleThemeMock).toHaveBeenCalledTimes(1);
  });
});
