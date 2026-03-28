
import React, { useState } from 'react';
import Modal from '../../common/Modal.tsx';
// FIX: Changed Bonus to Adjustment as Bonus type does not exist.
import { Adjustment, Photographer } from '../../../types.ts';

interface AddBonusModalProps {
    isOpen: boolean;
    onClose: () => void;
    // FIX: Changed onSave prop to use Adjustment type.
    onSave: (adjustment: Omit<Adjustment, 'id'>) => void;
    photographers: Photographer[];
}

const AddBonusModal: React.FC<AddBonusModalProps> = ({ isOpen, onClose, onSave, photographers }) => {
    const [photographerId, setPhotographerId] = useState<number | ''>('');
    const [amount, setAmount] = useState<number | ''>('');
    // FIX: Renamed 'reason' state to 'description' to match Adjustment type.
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    
    const inputStyles = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none";
    const labelStyles = "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1";


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // FIX: Check for description instead of reason.
        if (!photographerId || amount === '' || !description || !date) {
            alert('Please fill out all fields.');
            return;
        }

        // FIX: Create an Adjustment object with type 'Bonus'.
        const newAdjustment: Omit<Adjustment, 'id'> = {
            date,
            photographerId: Number(photographerId),
            amount: Number(amount),
            description,
            status: 'Unpaid',
            type: 'Bonus',
        };

        onSave(newAdjustment);
        // Reset form
        setPhotographerId('');
        setAmount('');
        // FIX: Reset description state.
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Bonus">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className={labelStyles}>Photographer</label>
                    <select value={photographerId} onChange={e => setPhotographerId(e.target.value === '' ? '' : Number(e.target.value))} className={inputStyles} required>
                        <option value="">Select a photographer...</option>
                        {photographers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelStyles}>Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} autoComplete="off" className={inputStyles} required />
                    </div>
                     <div>
                        <label className={labelStyles}>Bonus Amount</label>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0.00" autoComplete="off" className={inputStyles} required />
                    </div>
                </div>
                <div>
                    <label className={labelStyles}>Reason for Bonus</label>
                    {/* FIX: Use description state and update it onChange. */}
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Exceeded monthly target" autoComplete="off" className={inputStyles} required />
                </div>
                 <div className="pt-4 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold py-2 px-4 rounded-lg">Cancel</button>
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">Save Bonus</button>
                </div>
            </form>
        </Modal>
    );
};

export default AddBonusModal;
