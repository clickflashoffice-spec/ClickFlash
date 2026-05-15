import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal.tsx';
import { Product } from '../../types.ts';

/**
 * ProductEditModal Component Props
 */
interface ProductEditModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when product is saved */
  onSave: (product: Omit<Product, 'id'> | Product) => void;
  /** Product to edit (null for new product) */
  productToEdit: Product | null;
}

/**
 * ProductEditModal Component
 * 
 * Modal for creating and editing products.
 * 
 * Features:
 * - Create new products
 * - Edit existing products
 * - Product name, category, price, stock management
 * - Featured product flag
 * - Form validation
 * - Auto-reset on modal open/close
 * 
 * Validation:
 * - Product name is required
 * - Price must be non-negative
 * - Stock must be non-negative
 * 
 * @param {ProductEditModalProps} props - Component props
 */
const ProductEditModal: React.FC<ProductEditModalProps> = ({ isOpen, onClose, onSave, productToEdit }) => {
  const isNew = !productToEdit;
  const [product, setProduct] = useState<Omit<Product, 'id'> | Product>(productToEdit || { name: '', category: 'Print', price: 0, stock: 0, isFeatured: false });
  
  const inputStyles = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none";
  const labelStyles = "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1";


  useEffect(() => {
    if (isOpen) {
        setProduct(productToEdit || { name: '', category: 'Print', price: 0, stock: 0, isFeatured: false });
    }
  }, [productToEdit, isOpen]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (name === 'category') {
      setProduct(prev => ({ ...prev, category: value as Product['category'] }));
    } else {
      setProduct(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product.name.trim()) {
      alert('Product name is required');
      return;
    }
    if (product.price < 0) {
      alert('Price must be a positive number');
      return;
    }
    if ((product.stock ?? 0) < 0) {
      alert('Stock must be a positive number');
      return;
    }
    onSave(product);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isNew ? "Add Product" : "Edit Product"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
            <label htmlFor="name" className={labelStyles}>Product Name</label>
            <input type="text" id="name" name="name" value={product.name} onChange={handleChange} required autoComplete="off" className={inputStyles} />
        </div>
         <div>
            <label htmlFor="category" className={labelStyles}>Category</label>
            <select id="category" name="category" value={product.category} onChange={handleChange} required className={inputStyles}>
                <option>Print</option>
                <option>Digital</option>
                <option>Merchandise</option>
                <option>Other</option>
            </select>
        </div>
         <div className="grid grid-cols-2 gap-4">
             <div>
                <label htmlFor="price" className={labelStyles}>Price</label>
                <input 
                    type="number" 
                    id="price" 
                    name="price" 
                    value={product.price} 
                    onChange={handleChange} 
                    required 
                    min="0" 
                    step="0.01"
                    autoComplete="off" 
                    className={inputStyles} 
                />
            </div>
             <div>
                <label htmlFor="stock" className={labelStyles}>Stock</label>
                <input 
                    type="number" 
                    id="stock" 
                    name="stock" 
                    value={product.stock} 
                    onChange={handleChange} 
                    required 
                    min="0" 
                    step="1"
                    autoComplete="off" 
                    className={inputStyles} 
                />
            </div>
         </div>
         <div className="pt-4 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={onClose} className="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors">Cancel</button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">Save Product</button>
        </div>
      </form>
    </Modal>
  );
};

export default ProductEditModal;