import { useState, useEffect } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { UserCircle, Search, Mail, Smartphone, RefreshCw } from 'lucide-react';
import { fetchOrders } from '../lib/api';

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  galleries: number;
  totalSpent: number;
  lastActive: string;
};

const columnHelper = createColumnHelper<Customer>();

const columns = [
  columnHelper.accessor('name', {
    header: 'Customer Name',
    cell: info => <span className="text-white font-medium">{info.getValue() || 'Unknown'}</span>,
  }),
  columnHelper.accessor('email', {
    header: 'Contact',
    cell: info => (
      <div className="flex flex-col gap-1">
        {info.getValue() ? (
          <span className="flex items-center gap-1.5 text-slate-300 text-xs">
            <Mail className="w-3.5 h-3.5 text-slate-500" /> {info.getValue()}
          </span>
        ) : (
          <span className="text-slate-500 text-xs italic">No email</span>
        )}
        {info.row.original.phone ? (
          <span className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Smartphone className="w-3.5 h-3.5 text-slate-500" /> {info.row.original.phone}
          </span>
        ) : null}
      </div>
    ),
  }),
  columnHelper.accessor('galleries', {
    header: 'Galleries',
    cell: info => <span className="text-slate-300">{info.getValue()} unlocked</span>,
  }),
  columnHelper.accessor('totalSpent', {
    header: 'LTV (Spent)',
    cell: info => (
      <span className={`font-medium ${info.getValue() > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
        ${info.getValue().toFixed(2)}
      </span>
    ),
  }),
  columnHelper.accessor('lastActive', {
    header: 'Last Active',
    cell: info => <span className="text-slate-400">{info.getValue()}</span>,
  }),
];

export function CustomerView() {
  const [data, setData] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    const orders = await fetchOrders();
    
    // Group orders by email or phone to create unique customers
    const customersMap = new Map<string, Customer>();
    
    orders.forEach(order => {
      // Use email as primary key, fallback to phone, then fallback to name
      const key = order.email || (order as any).phone || (order as any).customerPhone || order.clientName;
      if (!key) return;

      if (customersMap.has(key)) {
        const existing = customersMap.get(key)!;
        existing.totalSpent += (order.total || 0);
        existing.galleries += 1; // Assuming each order relates to a gallery unlock roughly
      } else {
        customersMap.set(key, {
          id: `CUST-${order.id}`,
          name: order.clientName,
          email: order.email,
          phone: (order as any).phone || (order as any).customerPhone || '',
          galleries: 1,
          totalSpent: order.total || 0,
          lastActive: order.date || new Date().toISOString().split('T')[0]
        });
      }
    });

    setData(Array.from(customersMap.values()));
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredData = data.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <UserCircle className="w-8 h-8 text-fuchsia-500" />
            Customer CRM
          </h2>
          <p className="text-slate-400 mt-1">Manage client records, QR passes, and view gallery engagement.</p>
        </div>
        <button 
          onClick={loadData} 
          disabled={isLoading}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="relative w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by name, email, or pass ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-shadow"
            />
          </div>
          <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
               <RefreshCw className="w-8 h-8 animate-spin text-fuchsia-500 mb-4" />
               <p>Loading CRM data...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-slate-500">
               <p>No customers found.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="border-b border-slate-800 bg-slate-900/50">
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-800">
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-800/50 transition-colors">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-6 py-4 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
