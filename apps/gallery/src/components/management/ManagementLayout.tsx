
import React, { useState } from 'react';
import ManagementSidebar from './ManagementSidebar';
import ManagementDashboard from './ManagementDashboard';
import DestinationsPage from './DestinationsPage';
import ReportsPage from './ReportsPage';
import ExpensesPage from './ExpensesPage';
import CapitalPage from './CapitalPage';
import AdjustmentsPage from './AdjustmentsPage';
import PerformancePage from './PerformancePage';
import WarehousePage from './WarehousePage';
import PayrollPage from './PayrollPage';
import EcommerceSettingsPage from './EcommerceSettingsPage';
import ManagementSettingsPage from './ManagementSettingsPage';
import Spinner from '../common/Spinner.tsx';
import { Photographer } from '../../types.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';
import AccessDenied from '../common/AccessDenied.tsx';
import DocumentationPage from './DocumentationPage';

export type ManagementView = 'Dashboard' | 'Destinations' | 'Reports' | 'Expenses' | 'Capital' | 'Adjustments' | 'Performance' | 'Warehouse' | 'Payroll' | 'Ecommerce' | 'Settings' | 'Documentation';

interface ManagementLayoutProps {
  onLogout: () => void;
  currentUser: Photographer;
}

export const ManagementLayout: React.FC<ManagementLayoutProps> = ({ onLogout, currentUser }) => {
  const [currentView, setCurrentView] = useState<ManagementView>('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { can } = usePermissions(currentUser);

  const renderView = () => {
    switch (currentView) {
      case 'Dashboard':
        if (!can('viewManagementDashboard')) return <AccessDenied />;
        return <ManagementDashboard />;
      case 'Destinations':
        if (!can('viewDestinations')) return <AccessDenied />;
        return <DestinationsPage />;
      case 'Reports':
        if (!can('viewReports')) return <AccessDenied />;
        return <ReportsPage />;
      case 'Expenses':
        if (!can('viewExpenses')) return <AccessDenied />;
        return <ExpensesPage />;
      case 'Capital':
        if (!can('viewCapital')) return <AccessDenied />;
        return <CapitalPage />;
      case 'Adjustments':
        if (!can('viewAdjustments')) return <AccessDenied />;
        return <AdjustmentsPage />;
      case 'Performance':
        if (!can('viewPerformance')) return <AccessDenied />;
        return <PerformancePage />;
      case 'Warehouse':
        if (!can('viewWarehouse')) return <AccessDenied />;
        return <WarehousePage />;
      case 'Payroll':
        if (!can('viewPayroll')) return <AccessDenied />;
        return <PayrollPage currentUser={currentUser} />;
      case 'Ecommerce':
        if (!can('viewEcommerceSettings')) return <AccessDenied />;
        return <EcommerceSettingsPage />;
      case 'Settings':
        if (!can('viewGlobalSettings')) return <AccessDenied />;
        return <ManagementSettingsPage currentUser={currentUser} />;
      case 'Documentation':
        if (!can('viewDocumentation')) return <AccessDenied />;
        return <DocumentationPage />;
      default:
        return <div className="flex items-center justify-center h-full"><Spinner /></div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-sans">
      {/* Mobile Header */}
      <header className="md:hidden flex justify-between items-center p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 no-print">
        <div className="flex items-center space-x-3">
            <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-9 h-9 rounded-full" />
            <div>
                <h1 className="font-bold text-md leading-tight text-slate-900 dark:text-white">{currentUser.name}</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">{currentUser.role}</p>
            </div>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} aria-label="Toggle menu">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </header>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-20 w-64 transform transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} no-print`}>
          <ManagementSidebar 
            currentView={currentView} 
            setCurrentView={(v) => { setCurrentView(v); setIsSidebarOpen(false); }}
            onLogout={onLogout}
            currentUser={currentUser}
          />
      </div>
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-10 md:hidden no-print" onClick={() => setIsSidebarOpen(false)}></div>}
      
      <main className="md:ml-64 p-4 md:p-8">
        {renderView()}
      </main>
    </div>
  );
};
