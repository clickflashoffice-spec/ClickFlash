import { useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Users, UserPlus, MapPin, CircleDollarSign } from 'lucide-react';

type Staff = {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'break' | 'offline';
  location: string;
  todaySales: number;
};

const defaultData: Staff[] = [
  { id: 'EMP-001', name: 'Alex Johnson', role: 'Senior Photographer', status: 'active', location: 'Main Pool', todaySales: 1250.00 },
  { id: 'EMP-002', name: 'Sarah Smith', role: 'Photographer', status: 'break', location: 'Break Room A', todaySales: 850.00 },
  { id: 'EMP-003', name: 'Mike Davis', role: 'Editor', status: 'active', location: 'Office', todaySales: 0 },
  { id: 'EMP-004', name: 'Emily Wilson', role: 'Photographer', status: 'offline', location: 'Off Shift', todaySales: 0 },
];

const columnHelper = createColumnHelper<Staff>();

const columns = [
  columnHelper.accessor('name', {
    header: 'Name',
    cell: info => <span className="text-white font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor('role', {
    header: 'Role',
    cell: info => <span className="text-slate-300">{info.getValue()}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: info => {
      const status = info.getValue();
      if (status === 'active') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Active</span>;
      if (status === 'break') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400"><div className="w-2 h-2 rounded-full bg-amber-500" /> On Break</span>;
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400"><div className="w-2 h-2 rounded-full bg-slate-500" /> Offline</span>;
    },
  }),
  columnHelper.accessor('location', {
    header: 'Live Location (GPS)',
    cell: info => (
      <span className="flex items-center gap-1.5 text-slate-300">
        <MapPin className="w-4 h-4 text-slate-400" />
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('todaySales', {
    header: 'Today\'s Sales',
    cell: info => (
      <span className="flex items-center gap-1.5 font-medium text-emerald-400">
        <CircleDollarSign className="w-4 h-4" />
        {info.getValue() > 0 ? `$${info.getValue().toFixed(2)}` : '-'}
      </span>
    ),
  }),
];

export function StaffView() {
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
            <Users className="w-8 h-8 text-indigo-500" />
            Staff & HR Management
          </h2>
          <p className="text-slate-400 mt-1">Manage team shifts, monitor live locations, and track commissions.</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          <UserPlus className="w-4 h-4" />
          Hire / Invite Staff
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm col-span-1 md:col-span-3">
          <h3 className="text-slate-200 text-base font-semibold mb-4">Live Heatmap Overview</h3>
          <div className="h-64 bg-slate-800/50 rounded-lg border border-slate-700/50 flex flex-col items-center justify-center text-slate-400 relative overflow-hidden">
            <MapPin className="w-12 h-12 mb-2 opacity-50" />
            <p>Interactive Map Component</p>
            <p className="text-xs opacity-75">Loading mapbox tiles...</p>
            {/* Mock heatmap blob */}
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-rose-500/20 blur-3xl rounded-full" />
            <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-amber-500/20 blur-3xl rounded-full" />
          </div>
        </div>
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-slate-400 text-sm font-medium mb-1">Total Payroll (MTD)</h3>
            <p className="text-3xl font-bold text-white">$14,250</p>
          </div>
          <div>
            <h3 className="text-slate-400 text-sm font-medium mb-1">Pending Commissions</h3>
            <p className="text-3xl font-bold text-emerald-400">$2,450</p>
          </div>
          <button className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm font-medium transition-colors mt-4">
            Process Payouts
          </button>
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
                    <td key={cell.id} className="px-6 py-4 text-sm">
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
