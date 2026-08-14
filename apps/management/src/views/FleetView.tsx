import { useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { MonitorPlay, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

type Kiosk = {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'syncing';
  lastPing: string;
  cashInRegister: number;
};

const defaultData: Kiosk[] = [
  { id: 'K-01', name: 'Main Lobby', location: 'Resort A', status: 'online', lastPing: '2 mins ago', cashInRegister: 450.00 },
  { id: 'K-02', name: 'Poolside', location: 'Resort A', status: 'online', lastPing: '1 min ago', cashInRegister: 120.00 },
  { id: 'K-03', name: 'Waterpark Entrance', location: 'Resort B', status: 'offline', lastPing: '2 hours ago', cashInRegister: 0.00 },
  { id: 'K-04', name: 'Restaurant', location: 'Resort A', status: 'syncing', lastPing: '5 mins ago', cashInRegister: 850.50 },
  { id: 'K-05', name: 'Gift Shop', location: 'Resort B', status: 'online', lastPing: 'Just now', cashInRegister: 210.25 },
];

const columnHelper = createColumnHelper<Kiosk>();

const columns = [
  columnHelper.accessor('id', {
    header: 'Kiosk ID',
    cell: info => <span className="font-mono font-medium text-slate-300">{info.getValue()}</span>,
  }),
  columnHelper.accessor('name', {
    header: 'Name',
    cell: info => <span className="text-white font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor('location', {
    header: 'Location',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: info => {
      const status = info.getValue();
      if (status === 'online') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Online</span>;
      if (status === 'offline') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400"><XCircle className="w-3.5 h-3.5" /> Offline</span>;
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400"><AlertCircle className="w-3.5 h-3.5" /> Syncing</span>;
    },
  }),
  columnHelper.accessor('lastPing', {
    header: 'Last Ping',
    cell: info => <span className="text-slate-400">{info.getValue()}</span>,
  }),
  columnHelper.accessor('cashInRegister', {
    header: 'Cash in Register',
    cell: info => <span className="font-medium">${info.getValue().toFixed(2)}</span>,
  }),
];

export function FleetView() {
  const [data] = useState(() => [...defaultData]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <MonitorPlay className="w-8 h-8 text-blue-500" />
            Fleet & Ops Management
          </h2>
          <p className="text-slate-400 mt-1">Monitor kiosk fleet status, sync queues, and cash registers.</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
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
                    <td key={cell.id} className="px-6 py-4 text-sm text-slate-300">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
