
import React, { useEffect, useState } from 'react';
import { ManagementView } from './ManagementLayout';
import ThemeToggle from '../ThemeToggle.tsx';
import { usePermissions } from '../../hooks/usePermissions.ts';
import { Photographer, Permission } from '../../types.ts';

interface ManagementSidebarProps {
  currentView: ManagementView;
  setCurrentView: (view: ManagementView) => void;
  onLogout: () => void;
  currentUser: Photographer;
}

const NAV_ITEMS_CONFIG: { view: ManagementView, label: string, permission: Permission }[] = [
  { view: 'Dashboard', label: 'Dashboard', permission: 'viewManagementDashboard' },
  { view: 'Destinations', label: 'Destinations', permission: 'viewDestinations' },
  { view: 'Reports', label: 'Reports', permission: 'viewReports' },
  { view: 'Expenses', label: 'Expenses', permission: 'viewExpenses' },
  { view: 'Capital', label: 'Capital & Loans', permission: 'viewCapital' },
  { view: 'Adjustments', label: 'Adjustments', permission: 'viewAdjustments' },
  { view: 'Performance', label: 'Performance', permission: 'viewPerformance' },
  { view: 'Warehouse', label: 'Warehouse', permission: 'viewWarehouse' },
  { view: 'Payroll', label: 'Payroll', permission: 'viewPayroll' },
  { view: 'Ecommerce', label: 'E-commerce', permission: 'viewEcommerceSettings' },
  { view: 'Documentation', label: 'Documentation', permission: 'viewDocumentation' },
  { view: 'Settings', label: 'Settings', permission: 'viewGlobalSettings' },
];

const NavItem: React.FC<{
  item: typeof NAV_ITEMS_CONFIG[0];
  isActive: boolean;
  onClick: () => void;
}> = ({ item, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg w-full text-left transition-colors duration-200 ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
    }`}
  >
    <span className="font-medium">{item.label}</span>
  </button>
);


const ManagementSidebar: React.FC<ManagementSidebarProps> = ({ currentView, setCurrentView, onLogout, currentUser }) => {
    const { can } = usePermissions(currentUser);
    const visibleNavItems = NAV_ITEMS_CONFIG.filter(item => can(item.permission));
    const [branding, setBranding] = useState({
        title: 'Star Master',
        logoUrl: 'https://i.imgur.com/3Y2j2s2.png'
    });

    useEffect(() => {
        const savedBranding = localStorage.getItem('launchpadBranding');
        if (savedBranding) {
            try {
                setBranding(JSON.parse(savedBranding));
            } catch (e) { console.error(e); }
        }
    }, []);

    return (
        <aside className="w-64 bg-slate-100 dark:bg-slate-800 p-4 flex flex-col h-full space-y-2 border-r border-slate-200 dark:border-slate-700 no-print">
             <div className="flex items-center space-x-3 px-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                <img src={branding.logoUrl} alt="Logo" className="w-10 h-10 rounded-full object-cover" />
                <div>
                    <h1 className="font-bold text-slate-900 dark:text-white text-lg truncate max-w-[140px]">{branding.title}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Management</p>
                </div>
            </div>

            <div className="flex items-center space-x-3 p-4">
              <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-12 h-12 rounded-full object-cover" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{currentUser.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{currentUser.role}</p>
              </div>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto">
                {visibleNavItems.map((item) => (
                    <NavItem
                        key={item.view}
                        item={item}
                        isActive={currentView === item.view}
                        onClick={() => setCurrentView(item.view as ManagementView)}
                    />
                ))}
            </nav>

            <div className="space-y-2">
                 <button 
                    onClick={onLogout}
                    className="flex items-center space-x-3 px-4 py-3 rounded-lg w-full text-left transition-colors duration-200 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    <span className="font-medium">Logout</span>
                </button>
                 <div className="mt-auto pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center px-2">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Theme</p>
                    <ThemeToggle />
                </div>
            </div>
        </aside>
    );
};

export default ManagementSidebar;
