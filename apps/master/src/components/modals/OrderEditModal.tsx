
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Modal from '../common/Modal.tsx';
import { MOCK_PRODUCTS } from '../../constants.ts';
import { Order, OrderItem, Product, Photo } from '../../types.ts';
import { useCurrency } from '../CurrencyContext.tsx';
import { apiService } from '../../services/apiService.ts';
import PhotoEditModal from '../PhotoEditModal.tsx';

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
  const [previewingPhoto, setPreviewingPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    const initialOrder = JSON.parse(JSON.stringify(order));
    if (typeof initialOrder.appliedDiscount !== 'number') {
      initialOrder.appliedDiscount = 0;
    }
    // Ensure all items have a delivery type
    if (initialOrder.items) {
      initialOrder.items = initialOrder.items.map((item: any) => ({
        ...item,
        deliveryType: item.deliveryType || 'print'
      }));
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


  const handleItemChange = (itemId: string, field: keyof OrderItem, value: any) => {
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
      price: product.price,
      deliveryType: 'print'
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
   * Validates and saves all order data including:
   * - Order items (with proper serialization)
   * - Payment method
   * - Order status
   * - Applied discount
   * - Order totals (calculated and validated)
   * - Destination ID (preserved if exists)
   * - Client information (preserved)
   * 
   * Features:
   * - Item validation (must have at least one item)
   * - Total calculation and validation
   * - Optimistic locking support
   * - Field preservation (destinationId, photographerId, etc.)
   * 
   * @returns {void}
   */
  const handleSave = () => {
    // Validate order before saving
    if (!editedOrder.items || editedOrder.items.length === 0) {
      showToast('Order must have at least one item.');
      return;
    }

    // Validate item quantities and prices
    const invalidItems = editedOrder.items.filter(item =>
      item.quantity <= 0 || item.price < 0 || !item.name
    );
    if (invalidItems.length > 0) {
      showToast('Please ensure all items have valid quantities, prices, and names.');
      return;
    }

    // Validate totals
    const calculatedTotal = editedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = editedOrder.appliedDiscount || 0;
    const finalTotal = Math.max(0, calculatedTotal - discount);

    if (discount < 0) {
      showToast('Discount cannot be negative.');
      return;
    }

    if (finalTotal < 0) {
      showToast('Order total cannot be negative. Please check discount amount.');
      return;
    }

    // Prepare order data with all fields
    const orderToSave: Order = {
      ...editedOrder,
      total: finalTotal,
      // Ensure all required fields are present
      id: editedOrder.id,
      date: editedOrder.date,
      clientName: editedOrder.clientName,
      email: editedOrder.email,
      status: editedOrder.status,
      photographerId: editedOrder.photographerId,
      items: editedOrder.items.map(item => ({
        id: item.id,
        name: item.name,
        format: item.format,
        quantity: item.quantity,
        price: item.price,
        photo: item.photo, // Photo is optional
        deliveryType: item.deliveryType
      })),
      appliedDiscount: discount,
      paymentMethod: editedOrder.paymentMethod || 'Cash',
      // Preserve destinationId if it exists
      destinationId: editedOrder.destinationId,
      rfidTag: editedOrder.rfidTag,
      updatedAt: editedOrder.updatedAt || ''
    };

    // Add optimistic locking
    if (order.updatedAt) {
      (orderToSave as any).updated_at = order.updatedAt;
    }

    onSave(orderToSave);
  };

  /**
   * Complete order and save
   * 
   * Marks order as completed and saves it with all current changes.
   * Used when order is ready for fulfillment.
   * 
   * Features:
   * - Validates order has items
   * - Updates status to 'Completed'
   * - Saves all order data including payment method, items, and totals
   */
  const handleCompleteOrder = async () => {
    if (!editedOrder.items || editedOrder.items.length === 0) {
      showToast('Cannot complete order without items.');
      return;
    }

    // Calculate final total before completing
    const calculatedTotal = editedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = editedOrder.appliedDiscount || 0;
    const finalTotal = Math.max(0, calculatedTotal - discount);

    const completedOrder: Order = {
      ...editedOrder,
      status: 'Completed' as const,
      total: finalTotal,
      // Ensure payment method is set
      paymentMethod: editedOrder.paymentMethod || 'Cash'
    };

    setEditedOrder(completedOrder);

    // Add optimistic locking
    if (order.updatedAt) {
      (completedOrder as any).updated_at = order.updatedAt;
    }

    onSave(completedOrder);

    // Automation: Trigger Digital Delivery and Stock Reduction
    const hasDigital = editedOrder.items.some(item =>
      item.deliveryType === 'digital' || item.deliveryType === 'both'
    );

    const printItems = editedOrder.items.filter(item =>
      item.deliveryType === 'print' || item.deliveryType === 'both' || !item.deliveryType
    );

    // 1. Digital Delivery
    if (hasDigital) {
      showToast('Digital items detected. Finalizing digital delivery...');
      setTimeout(() => {
        handleFinalizeDelivery();
      }, 500);
    }

    // 2. Stock Reduction
    if (printItems.length > 0) {
      console.log('Automated Stock Reduction triggered for print items:', printItems);
      for (const item of printItems) {
        if (item.productId) {
          try {
            await apiService.reduceStock(item.productId, item.quantity);
          } catch (err) {
            console.error(`Failed to reduce stock for product ${item.productId}:`, err);
          }
        }
      }
    }
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

  const handlePhotoEditSave = async (_photoId: string, edits: any) => {
    if (!editingPhotoItem) return;

    // 1. Update Local State (Immediate UI Feedback)
    const updatedItems = editedOrder.items.map(item => {
      if (item.id === editingPhotoItem.itemId && item.photo) {
        return {
          ...item,
          photo: {
            ...item.photo,
            manualEdits: edits,
            // Also update metadata for consistency if we are transitioning to using metadata
            metadata: {
              ...item.photo.metadata,
              manualEdits: edits
            }
          }
        };
      }
      return item;
    });

    setEditedOrder(prev => ({ ...prev, items: updatedItems }));
    setEditingPhotoItem(null);

    // 2. Persist Global State (Async)
    // We save to the 'metadata' column of the photo record so it syncs to Kiosks/Gallery
    try {
      const photoToUpdate = editingPhotoItem.photo;
      if (photoToUpdate && photoToUpdate.id && !photoToUpdate.id.startsWith('upload-')) {
        const currentMetadata = photoToUpdate.metadata || {};
        await apiService.updatePhoto(photoToUpdate.id, {
          metadata: {
            ...currentMetadata,
            manualEdits: edits
          }
        });
        showToast('Photo edits saved to gallery.');
      }
    } catch (error) {
      console.error('Failed to save photo edits globally:', error);
      showToast('Warning: Edits saved to order only (Global sync failed).');
    }
  };

  const handleFinalizeDelivery = async () => {
    setIsFinalizing(true);
    try {
      const finalizedOrder = await apiService.finalizeOrderForCustomerDelivery(order.id);
      onSave(finalizedOrder);
      showToast('Digital delivery finalized! An email with login details has been sent to the customer.');
    } catch (err) {
      console.error(err);
      showToast('Error finalizing delivery. Please try again.');
    } finally {
      setIsFinalizing(false);
    }
  }

  const inputStyles = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-1 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Order Details: ${order.orderNumber || order.id}`} size="xl">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg"
        className="hidden"
        title="Upload photo"
      />
      {editingPhotoItem && (
        <PhotoEditModal
          isOpen={true}
          onClose={() => setEditingPhotoItem(null)}
          photo={editingPhotoItem.photo}
          photos={[editingPhotoItem.photo]}
          currentIndex={0}
          onNavigate={() => { }}
          onSave={handlePhotoEditSave}
        />
      )}
      {previewingPhoto && (
        <Modal
          isOpen={!!previewingPhoto}
          onClose={() => setPreviewingPhoto(null)}
          title={`Preview: ${previewingPhoto.title || 'Photo'}`}
          size="xl"
        >
          <div className="flex items-center justify-center bg-slate-900 rounded-lg overflow-hidden min-h-[400px]">
            <img
              src={previewingPhoto.url}
              alt={previewingPhoto.title}
              className="max-w-full max-h-[70vh] object-contain"
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setPreviewingPhoto(null)}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </Modal>
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
                className="ml-2 text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors uppercase tracking-wider"
                title="Revert status to Pending to allow editing"
              >
                (Unlock / Edit)
              </button>
            )}
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-700 my-4" />

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Payment Method</label>
            <select
              value={editedOrder.paymentMethod || 'Cash'}
              onChange={(e) => setEditedOrder(prev => ({ ...prev, paymentMethod: e.target.value as 'Cash' | 'Card' }))}
              disabled={isCompleted}
              className={inputStyles + " !py-2 font-medium"}
              title="Payment Method"
            >
              <option value="Cash">Cash (Physical)</option>
              <option value="Card">Bank Terminal / Card</option>
            </select>
          </div>

          {/* RFID / NFC Binding (Phase 29) */}
          <div className="pt-2">
            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
              <label className="block text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.1em] mb-2">Guest Wristband (RFID)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editedOrder.rfidTag || ''}
                  onChange={(e) => setEditedOrder(prev => ({ ...prev, rfidTag: e.target.value }))}
                  placeholder="Scan or enter tag..."
                  className={`${inputStyles} border-blue-200 dark:border-blue-800 focus:ring-blue-400 bg-white dark:bg-slate-800/50 !py-2`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      showToast('RFID Tag linked to guest');
                    }
                  }}
                />
                <div className="flex items-center justify-center px-3 bg-blue-500 text-white rounded-lg shadow-sm shadow-blue-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Order Items */}
        <div className="md:w-2/3">
          <h3 className="text-xl font-bold mb-2">Items</h3>
          <div className="max-h-96 overflow-y-auto pr-2 border rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-white/[0.02]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Item / Photo</th>
                  <th className="p-4 w-32 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Delivery</th>
                  <th className="p-4 w-20 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
                  <th className="p-4 w-28 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Price</th>
                  <th className="p-4 w-32 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Subtotal</th>
                  {!isCompleted && <th className="p-2 w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {editedOrder.items.map(item => (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <td className="p-3">
                      <div className="flex items-center space-x-4">
                        {item.photo ? (
                          <div
                            className="relative group cursor-pointer flex-shrink-0"
                            onClick={() => setPreviewingPhoto(item.photo!)}
                          >
                            <img
                              src={item.photo.url}
                              alt={item.photo.title}
                              className="w-16 h-16 object-cover rounded-lg border-2 border-white dark:border-slate-700 shadow-sm group-hover:ring-2 ring-blue-500 transition-all"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-black/40 rounded-lg">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex-shrink-0 flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-grow min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-tighter mb-1.5">{item.format}</p>

                          <div className="flex items-center gap-3">
                            {(!item.photo && !isCompleted) && (
                              <button type="button" onClick={() => handleUploadClick(item.id)} className="text-xs text-blue-500 hover:text-blue-400 font-bold flex items-center gap-1 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                Add Photo
                              </button>
                            )}
                            {item.photo && !isCompleted && (
                              <>
                                <button type="button" onClick={() => setEditingPhotoItem({ itemId: item.id, photo: item.photo! })} className="text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-blue-500 hover:text-white px-2 py-0.5 rounded font-bold transition-all text-slate-500">
                                  Edit
                                </button>
                                <button type="button" onClick={() => handleUploadClick(item.id)} className="text-[11px] text-slate-400 hover:text-blue-400 font-medium">
                                  Replace
                                </button>
                              </>
                            )}
                            {isCompleted && (
                              <button type="button" onClick={() => handleUploadClick(item.id)} className="text-[10px] bg-blue-500 hover:bg-blue-400 text-white font-black px-2 py-0.5 rounded shadow-sm transition-all whitespace-nowrap">
                                {item.photo ? 'REPLACE PHOTO' : 'ADD PHOTO'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex bg-slate-100 dark:bg-black/40 p-1 rounded-xl border border-slate-200 dark:border-white/5 mx-auto max-w-[140px]">
                        {(['print', 'digital', 'both'] as const).map(type => (
                          <button
                            key={type}
                            type="button"
                            disabled={isCompleted}
                            onClick={() => handleItemChange(item.id, 'deliveryType', type)}
                            className={`flex-1 py-1 px-1 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${item.deliveryType === type ?
                              (type === 'digital' ? 'bg-blue-600 text-white shadow-sm' :
                                type === 'both' ? 'bg-purple-600 text-white shadow-sm' :
                                  'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm') :
                              'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={item.quantity === 0 ? '' : item.quantity}
                        disabled={isCompleted}
                        onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value === '' ? 0 : Number(e.target.value))}
                        className={inputStyles + " text-center font-bold !bg-white dark:!bg-slate-900"}
                        title="Quantity"
                      />
                    </td>
                    <td className="p-3">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                        <input
                          type="number"
                          value={item.price}
                          disabled={isCompleted}
                          onChange={(e) => handleItemChange(item.id, 'price', Number(e.target.value))}
                          className={inputStyles + " pl-5 text-right font-mono !bg-white dark:!bg-slate-900"}
                          title="Price"
                        />
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                      {formatCurrency(item.quantity * item.price)}
                    </td>
                    {!isCompleted && <td className="p-3 text-center">
                      <button onClick={() => handleRemoveItem(item.id)} className="text-red-400 hover:text-red-600 transition-colors p-1" title="Remove item">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
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
              }} className={inputStyles + " p-2"} title="Add Product">
                <option>Add a product...</option>
                {MOCK_PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>)}
              </select>
            </div>
          )}
          <div className="mt-6 p-6 bg-slate-900/40 rounded-3xl border border-white/5 shadow-inner">
            <div className="space-y-4 max-w-sm ml-auto">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Subtotal</span>
                <span className="text-xl font-mono font-medium text-slate-300">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Discount</span>
                {isCompleted ? (
                  <span className="text-xl font-mono font-medium text-red-500/80">-{formatCurrency(editedOrder.appliedDiscount || 0)}</span>
                ) : (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-mono">$</span>
                    <input
                      type="number"
                      value={editedOrder.appliedDiscount === 0 ? '' : editedOrder.appliedDiscount}
                      onChange={e => handleDiscountChange(e.target.value)}
                      className="bg-black/20 border border-white/5 rounded-xl !w-32 text-right !py-2 font-mono font-bold text-red-400 focus:ring-1 focus:ring-blue-500/50 outline-none pl-6 transition-all"
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                <span className="text-sm font-black text-white uppercase tracking-widest">Grand Total</span>
                <div className="text-right">
                  <span className="text-4xl font-black text-blue-500 font-mono tracking-tighter drop-shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                    {formatCurrency(editedOrder.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-slate-200 dark:border-slate-700 mt-8">
        {/* Left Side: Print Actions Group */}
        <div className="flex items-center gap-3">
          {isCompleted && (
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
              <button
                type="button"
                onClick={() => onPrintReceipt(editedOrder)}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2.5 px-5 rounded-xl transition-all shadow-sm border border-slate-200 dark:border-slate-700 transform active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Customer Receipt
              </button>
              <button
                type="button"
                onClick={() => onPrintOrder(editedOrder)}
                className="flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold py-2.5 px-5 rounded-xl transition-all transform active:scale-95"
              >
                Worksheet
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Main Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {!isCompleted ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 md:flex-none border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black py-3 px-8 rounded-2xl transition-all active:scale-95"
              >
                CLOSE
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white font-black py-3 px-8 rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
              >
                SAVE CHANGES
              </button>
              <button
                type="button"
                onClick={handleCompleteOrder}
                className="flex-[2] md:flex-none bg-green-600 hover:bg-green-500 text-white font-black py-3 px-10 rounded-2xl transition-all shadow-lg shadow-green-500/20 active:scale-95"
              >
                COMPLETE ORDER
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 md:flex-none border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black py-3 px-8 rounded-2xl transition-all active:scale-95"
              >
                CLOSE
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white font-black py-3 px-8 rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
              >
                SAVE
              </button>
              <button
                type="button"
                onClick={handleFinalizeDelivery}
                disabled={isFinalizing || isDelivered}
                className="flex-[2] md:flex-none bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black py-3 px-10 rounded-2xl disabled:from-slate-600 disabled:to-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/20 active:scale-95"
              >
                {isFinalizing ? 'FINALIZING...' : isDelivered ? '✓ DELIVERED' : 'FINALIZE DIGITAL DELIVERY'}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default OrderEditModal;
