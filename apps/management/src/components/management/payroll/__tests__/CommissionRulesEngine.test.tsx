import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CommissionRulesEngine from '../CommissionRulesEngine';

describe('CommissionRulesEngine', () => {
  it('renders rule builder with default state', () => {
    render(<CommissionRulesEngine />);
    expect(screen.getByText('Commission Rules Engine')).toBeTruthy();
    expect(screen.getByText('High Volume Bonus')).toBeTruthy();
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
    
    // If sales is 1200, 15% is 180 base. Total rate would be 15 + bonuses.
    // The total rate should display
    expect(screen.getByText('15%')).toBeTruthy(); // Assuming no bonuses apply or updating text
  });

  it('deleting a rule removes it from the list', () => {
    render(<CommissionRulesEngine />);
    expect(screen.getByText('High Volume Bonus')).toBeTruthy();
    
    const deleteBtns = screen.getAllByRole('button').filter(btn => btn.className.includes('text-red-400') || btn.innerHTML.includes('Trash'));
    if (deleteBtns.length > 0) {
      fireEvent.click(deleteBtns[0]);
    }
    
    expect(screen.queryByText('High Volume Bonus')).toBeNull();
  });
});
