
import React, { useState, useMemo, useOptimistic } from 'react';
import Modal from '../common/Modal.tsx';
import { MOCK_PRODUCTS } from '../../constants.ts';
import { Order, OrderItem, Product, Photographer } from '../../types.ts';
import { useCurrency } from '../CurrencyContext.tsx';
import { useCreateOrder } from '../../hooks/useOrders.ts';
import { usePhotographers } from '../../hooks/usePhotographers.ts';

/**
 * CreateOrderModal Component Props
 */
interface CreateOrderModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when order is created */
  onOrderCreated: (order: Order) => void;
  /** Toast notification function */
  showToast: (message: string) => void;
  /** Current logged-in user */
  currentUser: Photographer;
}

/**
 * CreateOrderModal Component
 * 
 * Modal for creating manual orders in the Master Portal.
 * 
 * Features:
 * - Create new orders manually (not from Touch Kiosk)
 * - Add customer information (name, email)
 * - Add order items from product catalog
 * - Apply discounts
 * - Select photographer
 * - Calculate totals automatically
 * - Payment method selection
 * 
 * @param {CreateOrderModalProps} props - Component props
 */
const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated,
  showToast,
  currentUser
}) => {
  const [clientName, setClientName] = useState('');
  const [email, setEmail] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card'>('Cash');
  const [selectedPhotographerId, setSelectedPhotographerId] = useState(currentUser.id);
  const { formatCurrency } = useCurrency();
  const createOrderMutation = useCreateOrder();
  const { data: photographers = [] } = usePhotographers();

  const [optimisticItems, addOptimisticItem, removeOptimisticItem] = useOptimistic<OrderItem[]>(
    [],
    (state, action: { type: 'add'; item: OrderItem } | { type: 'remove'; id: string } | { type: 'update'; id: string; field: keyof OrderItem; value: string | number }) => {
      switch (action.type) {
        case 'add':
          return [...state, action.item];
        case 'remove':
          return state.filter(item => item.id !== action.id);
        case 'update':
          return state.map(item => item.id === action.id ? { ...item, [action.field]: action.value } : item);
        default:
          return state;
      }
    }
  );

  const subtotal = useMemo(() => {
    return optimisticItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
  }, [optimisticItems]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - appliedDiscount);
  }, [subtotal, appliedDiscount]);

  const handleAddItem = (product: Product) => {
    const newItem: OrderItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      name: product.name,
      format: product.category,
      quantity: 1,
      price: product.price
    };
    addOptimisticItem({ type: 'add', item: newItem });
  };

  const handleItemChange = (itemId: string, field: keyof OrderItem, value: string | number) => {
    addOptimisticItem({ type: 'update', id: itemId, field, value });
  };

  const handleRemoveItem = (itemId: string) => {
    removeOptimisticItem({ type: 'remove', id: itemId });
  };

  const handleCreateOrder = async () => {
    // Validation
    if (!clientName.trim()) {
      showToast('Please enter a client name.');
      return;
    }

    if (!email.trim()) {
      showToast('Please enter a client email.');
      return;
    }

    if (optimisticItems.length === 0) {
      showToast('Please add at least one item to the order.');
      return;
    }

    // Validate item quantities and prices
    const invalidItems = optimisticItems.filter(item =>
      item.quantity <= 0 || item.price < 0 || !item.name
    );
    if (invalidItems.length > 0) {
      showToast('Please ensure all items have valid quantities, prices, and names.');
      return;
    }

    if (appliedDiscount < 0) {
      showToast('Discount cannot be negative.');
      return;
    }

    if (total < 0) {
      showToast('Order total cannot be negative. Please check discount amount.');
      return;
    }

    try {
      const orderDate = new Date().toISOString().split('T')[0];
      const orderId = `ORD-${Date.now()}`;

      const newOrder: Partial<Order> = {
        id: orderId,
        date: orderDate,
        clientName: clientName.trim(),
        email: email.trim(),
        status: 'Pending',
        total: total,
        photographerId: selectedPhotographerId,
        items: optimisticItems.map(item => ({
          id: item.id,
          name: item.name,
          format: item.format,
          quantity: item.quantity,
          price: item.price,
          photo: item.photo // Optional
        })),
        appliedDiscount: appliedDiscount,
        paymentMethod: paymentMethod,
        source: 'manual' as const, // Mark as manual order
        destinationId: currentUser.destinationId || 'dest1'
      };

      const createdOrder = await createOrderMutation.mutateAsync(newOrder);
      showToast(`Order ${orderId} created successfully!`);
      onOrderCreated(createdOrder);

      // Reset form
      setClientName('');
      setEmail('');
      setItems([]);
      setAppliedDiscount(0);
      setPaymentMethod('Cash');
      setSelectedPhotographerId(currentUser.id);
      onClose();
    } catch (error: any) {
      console.error('Failed to create order:', error);
      const errorMessage = error?.message || 'Error creating order. Please try again.';
      showToast(errorMessage);
    }
  };

  const inputStyles = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Manual Order" size="xl">
      <div className="flex flex-col gap-6">
        {/* Customer Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Customer Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                Client Name *
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className={inputStyles}
                placeholder="Enter client name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputStyles}
                placeholder="Enter email address"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
              Photographer
            </label>
            <select
              value={selectedPhotographerId}
              onChange={(e) => setSelectedPhotographerId(e.target.value)}
              className={inputStyles}
              name="photographer"
              id="photographer"
              aria-label="Select Photographer"
            >
              {photographers.map(photographer => (
                <option key={photographer.id} value={photographer.id}>
                  {photographer.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Order Items */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Order Items</h3>
          <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-md">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-2">Item</th>
                  <th className="p-2 w-24">Qty</th>
                  <th className="p-2 w-32">Price</th>
                  <th className="p-2 w-32">Subtotal</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {optimisticItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-500">
                      No items added. Select a product below to add items.
                    </td>
                  </tr>
                ) : (
                  optimisticItems.map(item => (
                    <tr key={item.id} className="border-b border-slate-200 dark:border-slate-700">
                      <td className="p-2">
                        <p>{item.name}</p>
                        <p className="text-xs text-slate-500">{item.format}</p>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.quantity === 0 ? '' : item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value === '' ? 0 : Number(e.target.value))}
                          className={inputStyles}
                          min="1"
                          placeholder="Quantity"
                          aria-label={`Quantity for ${item.name}`}
                          title={`Quantity for ${item.name}`}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.price === 0 ? '' : item.price}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              'price',
                              e.target.value === '' ? 0 : Number(e.target.value)
                            )
                          }
                          className={inputStyles}
                          min="0"
                          step="0.01"
                          placeholder="Price"
                          aria-label={`Price for ${item.name}`}
                          title={`Price for ${item.name}`}
                        />
                      </td>
                      <td className="p-2 font-mono">{formatCurrency(item.quantity * item.price)}</td>
                      <td className="p-2">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-500 hover:text-red-400 font-bold"
                          title="Remove item"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Add Product */}
          <div>
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
              Add Product
            </label>
            <select
              aria-label="Add Product"
              title="Add Product"
              onChange={(e) => {
                const product = MOCK_PRODUCTS.find(p => p.id === e.target.value);
                if (product) handleAddItem(product);
                // Resetting the value so user can reselect the same product if desired
                e.target.selectedIndex = 0;
              }}
              className={inputStyles}
            >
              <option value="">Select a product to add...</option>
              {MOCK_PRODUCTS.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} - {formatCurrency(product.price)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-4">
          <div className="flex justify-end items-center">
            <span className="text-slate-500 dark:text-slate-400 mr-4">Subtotal:</span>
            <span className="text-xl font-semibold w-32 text-right">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-end items-center">
            <span className="text-slate-500 dark:text-slate-400 mr-4">Discount:</span>
            <input
              type="number"
              value={appliedDiscount === 0 ? '' : appliedDiscount}
              onChange={(e) => setAppliedDiscount(Number(e.target.value) || 0)}
              className={`${inputStyles} !w-32 text-right`}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
          <div className="flex justify-end items-center pt-2 border-t border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400 mr-4">Total:</span>
            <span className="text-3xl font-bold w-32 text-right">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label htmlFor="payment-method" className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
            Payment Method
          </label>
          <select
            id="payment-method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as 'Cash' | 'Card')}
            className={inputStyles}
            title="Select Payment Method"
          >
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreateOrder}
            disabled={createOrderMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createOrderMutation.isPending ? 'Creating...' : 'Create Order'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateOrderModal;

