import React, { useState, useEffect } from 'react';
import { Modal } from "@clickflash/ui";
import { TouchKiosk } from '../../types.ts';

interface KioskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (kiosk: Omit<TouchKiosk, 'id'> | TouchKiosk) => void;
  kioskToEdit: TouchKiosk | null;
}

const KioskEditModal: React.FC<KioskEditModalProps> = ({ isOpen, onClose, onSave, kioskToEdit }) => {
  const isNew = !kioskToEdit;
  const [kiosk, setKiosk] = useState<Partial<TouchKiosk>>(kioskToEdit || { name: '', id: '', status: 'Disconnected' });

  const inputStyles = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none";
  const labelStyles = "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1";


  useEffect(() => {
    if (isOpen) {
      setKiosk(kioskToEdit || { name: '', id: '', status: 'Disconnected' });
    }
  }, [kioskToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setKiosk(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kiosk.name?.trim()) {
      alert('Kiosk name is required');
      return;
    }
    if (!kiosk.id?.trim()) {
      alert('Kiosk ID is required');
      return;
    }
    onSave(kiosk as TouchKiosk);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isNew ? "Add Kiosk" : "Edit Kiosk"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className={labelStyles}>Kiosk Name</label>
          <input type="text" id="name" name="name" value={kiosk.name || ''} onChange={handleChange} required autoComplete="off" className={inputStyles} />
        </div>
        <div>
          <label htmlFor="id" className={labelStyles}>Kiosk ID</label>
          <input
            type="text"
            id="id"
            name="id"
            value={kiosk.id || ''}
            onChange={handleChange}
            required
            disabled={!isNew && kiosk.name !== 'Unconfigured Kiosk'}
            autoComplete="off"
            className={`${inputStyles} disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed`}
          />
          {(isNew || kiosk.name === 'Unconfigured Kiosk') && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">This ID must be unique.</p>}
          {!isNew && kiosk.name !== 'Unconfigured Kiosk' && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">The Kiosk ID cannot be changed after creation.</p>}
        </div>
        <div className="pt-4 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-700">
          <button type="button" onClick={onClose} className="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors">Cancel</button>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">Save Kiosk</button>
        </div>
      </form>
    </Modal>
  );
};

export default KioskEditModal;