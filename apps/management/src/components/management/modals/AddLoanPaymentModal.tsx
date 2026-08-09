import React, { useState, useEffect } from 'react';
import { Modal } from "@clickflash/ui";
import { LoanPayment } from '../../../types.ts';

interface AddLoanPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (payment: Omit<LoanPayment, 'id' | 'loanId'>) => void;
    loanId: string;
}

const AddLoanPaymentModal: React.FC<AddLoanPaymentModalProps> = ({ isOpen, onClose, onSave, loanId }) => {
    const [amount, setAmount] = useState<number | ''>('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (amount === '' || !date) {
            alert('Please fill out amount and date.');
            return;
        }

        const newPayment: Omit<LoanPayment, 'id' | 'loanId'> = {
            date,
            amount: Number(amount),
            notes,
        };

        onSave(newPayment);
    };
    
    useEffect(() => {
        if (!isOpen) {
            setAmount('');
            setDate(new Date().toISOString().split('T')[0]);
            setNotes('');
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Add Payment for Loan ${loanId}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-700 rounded p-2" required />
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Amount" className="w-full bg-slate-700 rounded p-2" required />
                </div>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (Optional)" className="w-full bg-slate-700 rounded p-2" />

                <div className="pt-4 flex justify-end space-x-3 border-t border-slate-700">
                    <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg">Cancel</button>
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">Save Payment</button>
                </div>
            </form>
        </Modal>
    );
};

export default AddLoanPaymentModal;