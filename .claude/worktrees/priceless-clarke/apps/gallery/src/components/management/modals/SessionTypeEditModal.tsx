import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import { SessionType } from '../../../types';
import { useCurrency } from '../../CurrencyContext';

interface SessionTypeEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (session: Omit<SessionType, 'id'> | SessionType) => void;
    sessionToEdit: SessionType | null;
}

const SessionTypeEditModal: React.FC<SessionTypeEditModalProps> = ({ isOpen, onClose, onSave, sessionToEdit }) => {
    const isNew = !sessionToEdit;
    const [session, setSession] = useState<Omit<SessionType, 'id'> | SessionType>(sessionToEdit || { name: '', numberOfPhotos: 20, price: 100 });
    const { currency } = useCurrency();

    useEffect(() => {
        if (isOpen) {
            setSession(sessionToEdit || { name: '', numberOfPhotos: 20, price: 100 });
        }
    }, [sessionToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        
        let processedValue: string | number = value;
        if (type === 'number') {
            processedValue = value === '' ? 0 : Number(value);
        }
        
        setSession(prev => ({ ...prev, [name]: processedValue }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Ensure all required fields are valid numbers
        const sessionData = {
            ...session,
            name: session.name.trim(),
            numberOfPhotos: Number(session.numberOfPhotos) || 0,
            price: Number(session.price) || 0
        };
        
        if (!sessionData.name) {
            alert('Session name is required');
            return;
        }
        if (sessionData.numberOfPhotos < 1) {
            alert('Number of photos must be at least 1');
            return;
        }
        if (sessionData.price < 0) {
            alert('Price must be a positive number');
            return;
        }
        
        onSave(sessionData);
    };

    const inputStyles = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isNew ? "Add Session Type" : "Edit Session Type"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Session Name</label>
                    <input type="text" name="name" value={session.name} onChange={handleChange} required className={inputStyles} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Number of Photos</label>
                        <input type="number" name="numberOfPhotos" value={session.numberOfPhotos} onChange={handleChange} required className={inputStyles} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Price ({currency.code})</label>
                        <input type="number" name="price" value={session.price} onChange={handleChange} required className={inputStyles} />
                    </div>
                </div>
                <div className="pt-4 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white font-semibold py-2 px-4 rounded-lg">Cancel</button>
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">Save Session Type</button>
                </div>
            </form>
        </Modal>
    );
};

export default SessionTypeEditModal;