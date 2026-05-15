import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal.tsx';
import { Pack } from '../../types.ts';

interface PackEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pack: Omit<Pack, 'id'> | Pack) => void;
  packToEdit: Pack | null;
}

const PackEditModal: React.FC<PackEditModalProps> = ({ isOpen, onClose, onSave, packToEdit }) => {
  const isNew = !packToEdit;
  const [pack, setPack] = useState(packToEdit || { name: '', description: '', price: 0, products: [] });
  
  const inputStyles = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none";
  const labelStyles = "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1";


  useEffect(() => {
    if(isOpen) {
        setPack(packToEdit || { name: '', description: '', price: 0, products: [] });
    }
  }, [packToEdit, isOpen]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setPack(prev => ({ 
      ...prev, 
      [name]: type === 'number' ? (value === '' ? 0 : Math.max(0, parseFloat(value) || 0)) : value 
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pack.name.trim()) {
      alert('Pack name is required');
      return;
    }
    if (!(pack.description ?? '').trim()) {
      alert('Description is required');
      return;
    }
    if (pack.price < 0) {
      alert('Price must be a positive number');
      return;
    }
    onSave(pack);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isNew ? "Add Pack" : "Edit Pack"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
            <label htmlFor="name" className={labelStyles}>Pack Name</label>
            <input type="text" id="name" name="name" value={pack.name} onChange={handleChange} required autoComplete="off" className={inputStyles} />
        </div>
        <div>
            <label htmlFor="description" className={labelStyles}>Description</label>
            <textarea name="description" id="description" value={pack.description} onChange={handleChange} required autoComplete="off" className={`${inputStyles} h-24`}></textarea>
        </div>
        <div>
            <label htmlFor="price" className={labelStyles}>Price</label>
            <input 
                type="number" 
                id="price" 
                name="price" 
                value={pack.price} 
                onChange={handleChange} 
                required 
                min="0" 
                step="0.01"
                autoComplete="off" 
                className={inputStyles} 
            />
        </div>
         <div className="pt-4 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={onClose} className="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors">Cancel</button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">Save Pack</button>
        </div>
      </form>
    </Modal>
  );
};

export default PackEditModal;