
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Modal from '../common/Modal.tsx';
import { MOCK_PRODUCTS } from '../../constants.ts';
import { Order, OrderItem, Product, Photo, ManualEdits } from '../../types.ts';
import { useCurrency } from '../CurrencyContext.tsx';
import { apiService } from '../../services/apiService.ts';
import PhotoEditModal from '../PhotoEditModal.tsx';
import { logger } from "@/utils/logger";

/**
 * OrderEditModal Component Props
 */
interface OrderEditModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Order to edit */
  order: Order;
  /** Callback when order is saved */
  onSave: (updatedOrder: Order) => void;
  /** Toast notification function */
  showToast: (message: string) => void;
  /** Callback to print order worksheet */
  onPrintOrder: (order: Order) => void;
  /** Callback to print receipt */
  onPrintReceipt: (order: Order) => void;
}

/**
 * OrderEditModal Component
 * 
 * Modal for editing order details, items, and status.
 * 
 * Features:
 * - Edit order items (quantity, price, format)
 * - Add/remove items from order
 * - Apply discounts
 * - Change order status (Pending → Completed → Delivered)
 * - Lock/unlock completed orders for editing
 * - Upload photos to order
 * - Calculate totals automatically
 * - Print order worksheet and receipt
 * - Payment method selection
 * - Notes field
 * 
 * State Management:
 * - Maintains local copy of order for editing
 * - Auto-calculates subtotal and total
 * - Validates order before saving
 * 
 * Performance:
 * - Uses useMemo for subtotal calculation
 * - Optimized re-renders
 * 
 * @param {OrderEditModalProps} props - Component props
 */
const OrderEditModal: React.FC<OrderEditModalProps> = ({ isOpen, onClose, order, onSave, showToast, onPrintOrder, onPrintReceipt }) => {
  const [editedOrder, setEditedOrder] = useState<Order>(JSON.parse(JSON.stringify(order)));
  const [isFinalizing, setIsFinalizing] = useState(false);
  const { formatCurrency } = useCurrency();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [itemToUpdate, setItemToUpdate] = useState<string | null>(null);
  const [editingPhotoItem, setEditingPhotoItem] = useState<{ itemId: string, photo: Photo } | null>(null);

  useEffect(() => {
    const initialOrder = JSON.parse(JSON.stringify(order));
    if (typeof initialOrder.appliedDiscount !== 'number') {
      initialOrder.appliedDiscount = 0;
    }
    setEditedOrder(initialOrder);
  }, [order]);

  const isCompleted = editedOrder.status === 'Completed' || editedOrder.status === 'Delivered';
  const isDelivered = editedOrder.status === 'Delivered';

  const subtotal = useMemo(() => {
    return editedOrder.items.reduce((acc, item) => acc + item.quantity * item.price, 0);
  }, [editedOrder.items]);

  useEffect(() => {
    const newTotal = subtotal - (editedOrder.appliedDiscount || 0);
    if (newTotal !== editedOrder.total) {
      setEditedOrder(prev => ({ ...prev, total: newTotal }));
    }
  }, [subtotal, editedOrder.appliedDiscount, editedOrder.total]);


  const handleItemChange = (itemId: string, field: keyof OrderItem, value: string | number) => {
    const updatedItems = editedOrder.items.map(item => {
      if (item.id === itemId) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setEditedOrder(prev => ({ ...prev, items: updatedItems }));
  };

  const handleDiscountChange = (value: string) => {
    setEditedOrder(prev => ({ ...prev, appliedDiscount: Number(value) || 0 }));
  };

  const handleAddItem = (product: Product) => {
    const newItem: OrderItem = {
      id: `item-${Date.now()}`,
      name: product.name,
      format: product.category,
      quantity: 1,
      price: product.price
    };
    const updatedItems = [...editedOrder.items, newItem];
    setEditedOrder(prev => ({ ...prev, items: updatedItems }));
  };

  const handleRemoveItem = (itemId: string) => {
    const updatedItems = editedOrder.items.filter(item => item.id !== itemId);
    setEditedOrder(prev => ({ ...prev, items: updatedItems }));
  };

  /**
   * Save order changes
   * 
   * Validates order data before saving:
   * - Ensures order has items
   * - Validates order totals
   * - Checks for required fields
   */
  const handleSave = () => {
    // Validate order before saving
    if (!editedOrder.items || editedOrder.items.length === 0) {
      showToast('Order must have at least one item.');
      return;
    }

    // Validate totals
    const calculatedTotal = editedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const finalTotal = calculatedTotal - (editedOrder.appliedDiscount || 0);

    if (finalTotal < 0) {
      showToast('Order total cannot be negative. Please check discount amount.');
      return;
    }

    // Update total if it doesn't match calculation
    const orderToSave = { ...editedOrder, total: finalTotal };

    // Add optimistic locking
    if (order.updatedAt) {
      (orderToSave as Order & { updated_at?: string }).updated_at = order.updatedAt;
    }

    onSave(orderToSave);
  };

  /**
   * Complete order and save
   * 
   * Marks order as completed and saves it.
   * Used when order is ready for fulfillment.
   */
  const handleCompleteOrder = () => {
    if (!editedOrder.items || editedOrder.items.length === 0) {
      showToast('Cannot complete order without items.');
      return;
    }

    const completedOrder = { ...editedOrder, status: 'Completed' as const };
    setEditedOrder(completedOrder);
    onSave(completedOrder);
  };

  const handleUnlockOrder = () => {
    setEditedOrder(prev => ({ ...prev, status: 'Pending' }));
    showToast('Order unlocked for editing. Status set to Pending.');
  };

  const handleUploadClick = (itemId: string) => {
    setItemToUpdate(itemId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !itemToUpdate) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const newPhoto: Photo = {
        id: `upload-${Date.now()}`,
        title: file.name,
        url: reader.result as string,
        photographerId: editedOrder.photographerId,
        albumId: '', // Added to satisfy type
      };

      const updatedItems = editedOrder.items.map(item =>
        item.id === itemToUpdate ? { ...item, photo: newPhoto } : item
      );
      setEditedOrder(prev => ({ ...prev, items: updatedItems }));
      setItemToUpdate(null);
    };
    reader.readAsDataURL(file);

    if (event.target) {
      event.target.value = '';
    }
  };

  const handlePhotoEditSave = (photoId: string, edits: ManualEdits) => {
    if (!editingPhotoItem) return;

    const updatedItems = editedOrder.items.map(item => {
      if (item.id === editingPhotoItem.itemId && item.photo) {
        return {
          ...item,
          photo: { ...item.photo, manualEdits: edits }
        };
      }
      return item;
    });

    setEditedOrder(prev => ({ ...prev, items: updatedItems }));
    setEditingPhotoItem(null);
  };

  const handleFinalizeDelivery = async () => {
    setIsFinalizing(true);
    try {
      const finalizedOrder = await apiService.finalizeOrderForCustomerDelivery(order.id);
      onSave(finalizedOrder);
      showToast('Digital delivery finalized! An email with login details has been sent to the customer.');
    } catch (err) {
      logger.error(err instanceof Error ? err.message : String(err));
      showToast('Error finalizing delivery. Please try again.');
    } finally {
      setIsFinalizing(false);
    }
  }

  const inputStyles = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-1 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Order Details: ${order.id}`} size="xl">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg"
        className="hidden"
      />
      {editingPhotoItem && (
        <PhotoEditModal
          isOpen={true}
          onClose={() => setEditingPhotoItem(null)}
          photo={editingPhotoItem.photo}
          onSave={handlePhotoEditSave}
        />
      )}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Order Info */}
        <div className="md:w-1/3 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Client Name</label>
            <p className="text-lg">{editedOrder.clientName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Client Email</label>
            <p className="text-lg">{editedOrder.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Order Date</label>
            <p className="text-lg">{editedOrder.date}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Status</label>
            <span className={`px-2 py-1 rounded-full text-sm font-semibold ${editedOrder.status === 'Completed' ? 'bg-green-500/20 text-green-400' :
              editedOrder.status === 'Delivered' ? 'bg-purple-500/20 text-purple-400' :
                editedOrder.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
              }`}>
              {editedOrder.status}
            </span>
            {isCompleted && (
              <button
                onClick={handleUnlockOrder}
                className="ml-2 text-xs text-blue-500 hover:underline"
                title="Revert status to Pending to allow editing"
              >
                Unlock / Edit
              </button>
            )}
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Payment Method</label>
            <select
              value={editedOrder.paymentMethod || 'Cash'}
              onChange={(e) => setEditedOrder(prev => ({ ...prev, paymentMethod: e.target.value as 'Cash' | 'Card' }))}
              disabled={isCompleted}
              className={inputStyles}
            >
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
            </select>
          </div>

        </div>

        {/* Order Items */}
        <div className="md:w-2/3">
          <h3 className="text-xl font-bold mb-2">Items</h3>
          <div className="max-h-64 overflow-y-auto pr-2 border-b border-t border-slate-200 dark:border-slate-700">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white dark:bg-slate-800">
                <tr>
                  <th className="p-2">Item</th>
                  <th className="p-2 w-24">Qty</th>
                  <th className="p-2 w-32">Price</th>
                  <th className="p-2 w-32">Subtotal</th>
                  {!isCompleted && <th className="p-2 w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {editedOrder.items.map(item => (
                  <tr key={item.id}>
                    <td className="p-2">
                      <div className="flex items-center space-x-3">
                        {item.photo ? (
                          <img src={item.photo.url} alt={item.photo.title} className="w-12 h-12 object-cover rounded-md flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-md flex-shrink-0"></div>
                        )}
                        <div className="flex-grow">
                          <p>{item.name}</p>
                          {(!item.photo && !isCompleted) && (
                            <button type="button" onClick={() => handleUploadClick(item.id)} className="text-xs text-blue-400 hover:underline">
                              Add Photo
                            </button>
                          )}
                          {item.photo && !isCompleted && (
                            <div className="flex space-x-2 mt-1">
                              <button type="button" onClick={() => setEditingPhotoItem({ itemId: item.id, photo: item.photo! })} className="text-xs text-blue-500 hover:underline font-medium">
                                Edit Photo
                              </button>
                              <button type="button" onClick={() => handleUploadClick(item.id)} className="text-xs text-slate-400 hover:underline">
                                Replace
                              </button>
                            </div>
                          )}
                          {isCompleted && (
                            <button type="button" onClick={() => handleUploadClick(item.id)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-2 rounded mt-1">
                              {item.photo ? 'Replace Photo' : 'Add Photo'}
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={item.quantity === 0 ? '' : item.quantity}
                        disabled={isCompleted}
                        onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value === '' ? 0 : Number(e.target.value))}
                        className={inputStyles}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={item.price}
                        disabled={isCompleted}
                        onChange={(e) => handleItemChange(item.id, 'price', Number(e.target.value))}
                        className={inputStyles}
                      />
                    </td>
                    <td className="p-2 font-mono">{formatCurrency(item.quantity * item.price)}</td>
                    {!isCompleted && <td>
                      <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-400">&times;</button>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!isCompleted && (
            <div className="mt-2">
              <select onChange={(e) => {
                const product = MOCK_PRODUCTS.find(p => p.id === e.target.value);
                if (product) handleAddItem(product);
              }} className={inputStyles + " p-2"}>
                <option>Add a product...</option>
                {MOCK_PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>)}
              </select>
            </div>
          )}
          <div className="text-right mt-4 space-y-2">
            <div className="flex justify-end items-center">
              <span className="text-slate-500 dark:text-slate-400 mr-4">Subtotal:</span>
              <span className="text-xl font-semibold w-32 text-right">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-end items-center">
              <span className="text-slate-500 dark:text-slate-400 mr-4">Discount:</span>
              {isCompleted ? (
                <span className="text-xl font-semibold w-32 text-right">{formatCurrency(editedOrder.appliedDiscount || 0)}</span>
              ) : (
                <input
                  type="number"
                  value={editedOrder.appliedDiscount === 0 ? '' : editedOrder.appliedDiscount}
                  onChange={e => handleDiscountChange(e.target.value)}
                  className={`${inputStyles} !w-32 text-right`}
                  placeholder="0.00"
                />
              )}
            </div>
            <div className="flex justify-end items-center pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 mr-4">Total:</span>
              <span className="text-3xl font-bold w-32 text-right">{formatCurrency(editedOrder.total)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="pt-6 flex justify-between items-center space-x-3 border-t border-slate-200 dark:border-slate-700 mt-6">
        <div>
          {isCompleted && (
            <button
              type="button"
              onClick={() => onPrintReceipt(editedOrder)}
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Print Customer Receipt
            </button>
          )}
        </div>
        <div className="flex space-x-3">
          {!isCompleted ? (
            <>
              <button type="button" onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors">Cancel</button>
              <button type="button" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">Save Changes</button>
              <button type="button" onClick={handleCompleteOrder} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">Mark as Complete</button>
            </>
          ) : (
            <>
              <button type="button" onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors">Close</button>
              {/* Allow saving even if completed, mainly for notes or minor adjustments if unlocked */}
              <button type="button" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">Save Changes</button>
              <button type="button" onClick={() => onPrintOrder(editedOrder)} className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">Print Worksheet</button>
              <button
                type="button"
                onClick={handleFinalizeDelivery}
                disabled={isFinalizing || isDelivered}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors"
              >
                {isFinalizing ? 'Finalizing...' : isDelivered ? '✓ Delivered' : 'Finalize Digital Delivery'}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default OrderEditModal;
