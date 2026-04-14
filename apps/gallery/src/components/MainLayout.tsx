
import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Sidebar } from './Sidebar';
import Dashboard from './Dashboard';
import Albums from './albums/Albums';
import Orders from './Orders';
import Photographers from './Photographers';
import SettingsPage from './settings/SettingsPage';
import AIIdeasModal from './AIIdeasModal';
import Toast from './common/Toast';
import { apiService } from '../services/apiService.ts';
import { Order, Photographer, Album, View } from '../types.ts';
import Spinner from './common/Spinner';
import Bookings from './bookings/Bookings';
import { usePermissions } from '../hooks/usePermissions.ts';
import AccessDenied from './common/AccessDenied';
import PrintLayout from './orders/PrintLayout';
import SyncStatusIndicator from './common/SyncStatusIndicator';
import CustomerReceipt from './orders/CustomerReceipt';
import Clients from './Clients';
import LabPrintFolder from './orders/LabPrintFolder';
import ProductsPage from './ProductsPage';
import { useDestinationFeatures } from '../hooks/useDestinationFeatures.ts';
import { logger } from '../utils/logger.ts';
import { TIMEOUTS } from '../constants/timing.ts';

// Lazy load heavy components for code splitting
const DocumentationPage = lazy(() => import('./management/DocumentationPage'));

/**
 * MainLayout Component Props
 */
interface MainLayoutProps {
  /** Callback to switch/logout user */
  onSwitchUser: () => void;
  /** Current logged-in user */
  currentUser: Photographer;
  /** Whether the app is online (for AI features) */
  isOnline: boolean;
  /** Data version number - increments trigger data refresh */
  dataVersion?: number;
  /** Optional callback to refresh user data */
  onRefreshUser?: () => void;
}

/**
 * MainLayout Component
 * 
 * Main layout component for the Master Portal, providing:
 * - Sidebar navigation
 * - View routing (Dashboard, Albums, Orders, etc.)
 * - Data fetching and refresh management
 * - Toast notifications
 * - Auto-refresh based on visibility and intervals
 * - Permission-based access control
 * 
 * Features:
 * - Lazy loading of heavy components (DocumentationPage)
 * - Visibility-based auto-refresh (pauses when tab is hidden)
 * - Force refresh capability
 * - WebSocket integration for real-time updates
 * - Print/receipt/lab folder views
 * 
 * @param {MainLayoutProps} props - Component props
 */
/**
 * MainLayout Component
 * 
 * Main layout component for the Master Portal, providing:
 * - Sidebar navigation
 * - View routing (Dashboard, Albums, Orders, etc.)
 * - Data fetching and refresh management
 * - Toast notifications
 * - Auto-refresh based on visibility and intervals
 * - Permission-based access control
 * 
 * Features:
 * - Lazy loading of heavy components (DocumentationPage)
 * - Visibility-based auto-refresh (pauses when tab is hidden)
 * - Force refresh capability
 * - WebSocket integration for real-time updates
 * - Print/receipt/lab folder views
 * 
 * @param {MainLayoutProps} props - Component props
 */
const MainLayout: React.FC<MainLayoutProps> = ({ onSwitchUser, currentUser, isOnline, dataVersion = 0, onRefreshUser }) => {
  const [currentView, setCurrentView] = useState<View>('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAIIdeasModalOpen, setAIIdeasModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [printOrderData, setPrintOrderData] = useState<Order | null>(null);
  const [receiptOrderData, setReceiptOrderData] = useState<Order | null>(null);
  const [labFolderOrder, setLabFolderOrder] = useState<Order | null>(null);

  const [dashboardData, setDashboardData] = useState<{ orders: Order[]; photographers: Photographer[], albums: Album[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const { can } = usePermissions(currentUser);

  // Get global feature flags for this destination
  const { features } = useDestinationFeatures(currentUser);

  /**
   * Fetch dashboard data (orders, photographers, albums)
   * 
   * Features:
   * - Parallel data fetching for better performance
   * - Loading state management
   * - Error handling with fallback to empty arrays
   * - Last refresh time tracking for incremental refresh
   * 
   * @param {boolean} forceRefresh - If true, always show loading state
   * @returns {Promise<void>}
   */
  const fetchDashboardData = useCallback(async (forceRefresh = false) => {
    // Don't set loading on initial mount if we have cached data
    const isInitialLoad = !dashboardData;
    if (isInitialLoad || forceRefresh) {
      setLoading(true);
    }

    try {
      const [allOrders, allPhotographers, allAlbums] = await Promise.all([
        apiService.getOrders(),
        apiService.getUsers(),
        apiService.getAlbums(),
      ]);
      setDashboardData({
        orders: allOrders,
        photographers: allPhotographers,
        albums: allAlbums,
      });

      // Store last refresh time for incremental refresh
      localStorage.setItem('lastDashboardRefresh', new Date().toISOString());
    } catch (error) {
      logger.error("Failed to load dashboard data", error instanceof Error ? error : undefined, { userId: currentUser?.id });
      // If we have no data and failed, show error state
      if (isInitialLoad && !dashboardData) {
        setDashboardData({ orders: [], photographers: [], albums: [] });
      }
    } finally {
      setLoading(false);
    }
  }, [dashboardData, currentUser?.id]);

  /**
   * Manually refresh all dashboard data
   * 
   * Forces a full refresh of all data and updates the current user.
   * Used by refresh buttons and after data-modifying operations.
   * 
   * @returns {Promise<void>}
   */
  const refreshData = useCallback(async () => {
    logger.info('MainLayout: Refreshing all local data', { userId: currentUser?.id });
    try {
      // Trigger backend data refresh first
      await apiService.refreshData();
    } catch (e) {
      logger.warn('Backend refresh trigger failed', e instanceof Error ? e : new Error(String(e)));
    }

    await fetchDashboardData(true); // Force refresh
    if (onRefreshUser) {
      onRefreshUser();
    }
  }, [fetchDashboardData, onRefreshUser, currentUser?.id]);


  useEffect(() => {
    fetchDashboardData();
  }, [currentUser, dataVersion]); // Removed fetchDashboardData from deps to avoid re-renders

  // Auto-refresh data at regular intervals (only when tab is visible)
  useEffect(() => {
    if (!currentUser) return; // Don't refresh if not logged in

    let refreshInterval: NodeJS.Timeout | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause refresh when tab is hidden
        if (refreshInterval) {
          clearInterval(refreshInterval);
          refreshInterval = null;
        }
      } else {
        // Resume refresh when tab becomes visible
        if (!refreshInterval) {
          // Refresh immediately when tab becomes visible
          fetchDashboardData(true);
          refreshInterval = setInterval(() => {
            logger.debug('Auto-refreshing dashboard data', { userId: currentUser?.id });
            fetchDashboardData();
          }, TIMEOUTS.AUTO_REFRESH_INTERVAL);
        }
      }
    };

    // Initial setup
    if (!document.hidden) {
      refreshInterval = setInterval(() => {
        logger.debug('Auto-refreshing dashboard data', { userId: currentUser?.id });
        fetchDashboardData();
      }, TIMEOUTS.AUTO_REFRESH_INTERVAL);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, fetchDashboardData]);

  useEffect(() => {
    const handlePrint = (onCleanup: () => void) => {
      const handleAfterPrint = () => {
        onCleanup();
        window.removeEventListener('afterprint', handleAfterPrint);
      };
      window.addEventListener('afterprint', handleAfterPrint);
      const timer = setTimeout(() => {
        window.print();
      }, 100);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
    }
    if (printOrderData) return handlePrint(() => setPrintOrderData(null));
    if (receiptOrderData) return handlePrint(() => setReceiptOrderData(null));
  }, [printOrderData, receiptOrderData]);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  const handleOpenAIIdeas = () => {
    if (!isOnline) {
      showToast("AI features require an internet connection.");
      return;
    }
    setAIIdeasModalOpen(true);
    setIsSidebarOpen(false);
  };

  const handleNavigate = (view: View) => {
    setCurrentView(view);
    setLabFolderOrder(null);
  };

  const renderView = () => {
    // Show UI immediately, load data in background
    if (!dashboardData && loading) {
      // Only show spinner on initial load, not on refreshes
      return <div className="flex items-center justify-center h-full min-h-[50vh]"><Spinner /></div>;
    }

    if (labFolderOrder) {
      return <LabPrintFolder
        order={labFolderOrder}
        onBack={() => setLabFolderOrder(null)}
        onUpdateOrder={(updated) => {
          refreshData();
          setLabFolderOrder(updated);
        }}
      />;
    }

    switch (currentView) {
      case 'Dashboard':
        if (!can('viewDashboard')) return <AccessDenied />;
        return <Dashboard localData={dashboardData ?? { orders: [], photographers: [], albums: [] }} currentUser={currentUser} onNavigate={handleNavigate} />;
      case 'Albums':
        if (!can('viewAlbums')) return <AccessDenied />;
        return <Albums showToast={showToast} currentUser={currentUser} isOnline={isOnline} refreshTrigger={dataVersion} />;
      case 'Bookings':
        if (!can('viewBookings')) return <AccessDenied />;
        return <Bookings showToast={showToast} />;
      case 'Orders':
        if (!can('viewOrders')) return <AccessDenied />;
        return <Orders
          showToast={showToast}
          currentUser={currentUser}
          onPrintOrder={setPrintOrderData}
          onPrintReceipt={setReceiptOrderData}
          onOpenLabFolder={setLabFolderOrder}
        />;
      case 'Clients':
        if (!can('viewOrders')) return <AccessDenied />;
        return <Clients currentUser={currentUser} />;
      case 'Photographers':
        if (!can('viewPhotographers')) return <AccessDenied />;
        return <Photographers currentUser={currentUser} photographers={dashboardData?.photographers ?? []} orders={dashboardData?.orders ?? []} refreshData={refreshData} />;
      case 'Documentation':
        if (!can('viewDocumentation')) return <AccessDenied />;
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full min-h-[50vh]"><Spinner /></div>}>
            <DocumentationPage />
          </Suspense>
        );
      case 'Products':
        if (!can('manageProducts')) return <AccessDenied />;
        return <ProductsPage />;
      case 'Settings':
        if (!can('viewSettings')) return <AccessDenied />;
        return <SettingsPage currentUser={currentUser} onCurrentUserUpdate={refreshData} showToast={showToast} features={features} />;
      default:
        return <Dashboard localData={dashboardData ?? { orders: [], photographers: [], albums: [] }} currentUser={currentUser} onNavigate={handleNavigate} />;
    }
  };

  if (printOrderData) return <PrintLayout order={printOrderData} />;
  if (receiptOrderData) return <CustomerReceipt order={receiptOrderData} />;
  if (labFolderOrder) return <LabPrintFolder order={labFolderOrder} onBack={() => setLabFolderOrder(null)} onUpdateOrder={(updated) => { refreshData(); setLabFolderOrder(updated); }} />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-sans flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex justify-between items-center p-4 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 backdrop-blur-md shadow-sm no-print">
        <div className="flex items-center space-x-3">
          <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-9 h-9 rounded-full ring-2 ring-white dark:ring-slate-700" />
          <div>
            <h1 className="font-bold text-md leading-tight text-slate-900 dark:text-white">{currentUser.name}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{currentUser.role}</p>
          </div>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} aria-label="Open menu" className="p-2 rounded-lg active:bg-slate-100 dark:active:bg-slate-800">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </header>

      {/* Sidebar Overlay for Mobile */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} no-print`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 shadow-2xl transform transition-transform duration-300 md:relative md:translate-x-0 md:w-64 md:shadow-none md:bg-transparent border-r border-slate-200 dark:border-slate-700 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} no-print`}>
        <Sidebar
          currentView={currentView}
          setCurrentView={(view: View) => {
            setCurrentView(view);
            setIsSidebarOpen(false);
          }}
          onOpenAIIdeas={handleOpenAIIdeas}
          onSwitchUser={onSwitchUser}
          currentUser={currentUser}
          isOnline={isOnline}
          features={features}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 md:h-screen md:overflow-y-auto custom-scrollbar">
        <div className="hidden md:flex justify-end items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-20 no-print">
          <SyncStatusIndicator isOnline={isOnline} />
        </div>
        <div className="p-4 pb-20 md:p-8 md:pb-8">
          {renderView()}
        </div>
      </main>

      <AIIdeasModal isOpen={isAIIdeasModalOpen} onClose={() => setAIIdeasModalOpen(false)} />
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  );
};

export default MainLayout;