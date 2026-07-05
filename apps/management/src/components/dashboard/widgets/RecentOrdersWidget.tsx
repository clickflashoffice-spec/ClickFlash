
import React from "react";
import Card from '../../common/Card.tsx';
import { Order } from '../../../types.ts';
import { useCurrency } from '../../CurrencyContext.tsx';

interface RecentOrdersWidgetProps {
  orders: Order[];
  onOrderClick?: (orderId: string) => void;
}

const RecentOrdersWidget: React.FC<RecentOrdersWidgetProps> = ({ orders, onOrderClick }) => {
  const { formatCurrency } = useCurrency();
  const recentOrders = [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  if (recentOrders.length === 0) {
    return (
      <Card className="!p-0">
        <h3 className="text-lg font-bold p-4 text-slate-900">Recent Orders</h3>
        <div className="p-8 text-center">
          <div className="bg-slate-100 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium">No orders yet</p>
          <p className="text-sm text-slate-500 mt-1">Orders will appear here once created</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="!p-0">
      <h3 className="text-lg font-bold p-4 text-slate-900">Recent Orders</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-t border-slate-200 text-slate-500">
            <tr>
              <th className="p-4">Order ID</th>
              <th className="p-4">Client Name</th>
              <th className="p-4">Status</th>
              <th className="p-4">Date</th>
              <th className="p-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((order) => (
              <tr
                key={order.id}
                className={`border-b border-slate-200 transition-colors ${onOrderClick ? 'cursor-pointer hover:bg-slate-50' : ''
                  }`}
                onClick={() => onOrderClick?.(order.id)}
              >
                <td className="p-4 font-mono text-sm text-slate-600">{order.id.slice(0, 8)}...</td>
                <td className="p-4 font-medium text-slate-900">{order.clientName || 'N/A'}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${order.status === 'Completed'
                      ? 'bg-green-100 text-green-600'
                      : order.status === 'Pending'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                    {order.status}
                  </span>
                </td>
                <td className="p-4 text-sm text-slate-500">
                  {new Date(order.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </td>
                <td className="p-4 text-right font-semibold text-slate-900">{formatCurrency(order.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

RecentOrdersWidget.displayName = 'RecentOrdersWidget';
export default React.memo(RecentOrdersWidget);
