import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CommissionRulesEngine from '../CommissionRulesEngine';

describe('CommissionRulesEngine', () => {
  it('renders rule builder with default state', () => {
    render(<CommissionRulesEngine />);
    expect(screen.getByText('Commission Rules Engine')).toBeTruthy();
    expect(screen.getAllByText('High Volume Bonus').length).toBeGreaterThan(0);
  });

  it('adding a tiered rule shows it in the list', () => {
    render(<CommissionRulesEngine />);
    
    // Click Add Rule
    const addRuleBtn = screen.getByText('Add Rule');
    fireEvent.click(addRuleBtn);
    
    // Fill out the modal
    const nameInput = screen.getByPlaceholderText('e.g. Weekend Warrior');
    fireEvent.change(nameInput, { target: { value: 'New Test Rule' } });
    
    const saveBtn = screen.getByText('Save Rule');
    fireEvent.click(saveBtn);
    
    // Check if added
    expect(screen.getByText('New Test Rule')).toBeTruthy();
  });

  it('changing base rate updates preview calculation correctly', () => {
    render(<CommissionRulesEngine />);
    
    const baseRateInputs = screen.getAllByRole('spinbutton');
    // baseRate is the third spinbutton in the simulator form
    const baseRateInput = baseRateInputs[2];
    
    fireEvent.change(baseRateInput, { target: { value: '15' } });
    
    // If sales is 1200, High Volume Bonus (+5%) applies. 15% base + 5% bonus = 20% total rate.
    expect(screen.getByText('20%')).toBeTruthy();
  });

  it('deleting a rule removes it from the list', () => {
    render(<CommissionRulesEngine />);
    expect(screen.getAllByText('Power Seller').length).toBeGreaterThan(0);
    
    // Find all delete buttons in rule list (last buttons with Trash icon)
    const buttons = screen.getAllByRole('button');
    // Click the delete button for Power Seller (second rule)
    const deleteButtons = buttons.filter(btn => btn.querySelector('svg') && (btn.className.includes('hover:text-red-400') || btn.className.includes('red')));
    if (deleteButtons.length > 1) {
      fireEvent.click(deleteButtons[1]);
    } else if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);
    }
    
    expect(screen.queryByText('Power Seller')).toBeNull();
  });
});
