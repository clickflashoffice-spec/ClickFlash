import { useState, useEffect, lazy, Suspense, type ReactNode } from 'react';
import { 
  LayoutDashboard, 
  MonitorSmartphone, 
  Users, 
  UserCircle, 
  Tag, 
  Bot, 
  CreditCard, 
  Images, 
  LogOut, 
  Settings, 
  MessageCircle, 
  Activity, 
  Sparkles, 
  HardDrive,
  Camera, 
  Gift, 
  Sparkles as SparklesIcon, 
  CircleDollarSign,
  Loader2
} from 'lucide-react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { LoginView } from './views/LoginView';

// Route-level code splitting with dynamic imports
const DashboardView = lazy(() => import('./views/DashboardView').then(m => ({ default: m.DashboardView })));
const FleetView = lazy(() => import('./views/FleetView').then(m => ({ default: m.FleetView })));
const StaffView = lazy(() => import('./views/StaffView').then(m => ({ default: m.StaffView })));
const CustomerView = lazy(() => import('./views/CustomerView').then(m => ({ default: m.CustomerView })));
const GalleriesView = lazy(() => import('./views/GalleriesView').then(m => ({ default: m.GalleriesView })));
const PricingView = lazy(() => import('./views/PricingView').then(m => ({ default: m.PricingView })));
const AICommandView = lazy(() => import('./views/AICommandView').then(m => ({ default: m.AICommandView })));
const FinancialsView = lazy(() => import('./views/FinancialsView').then(m => ({ default: m.FinancialsView })));
const SystemSettingsView = lazy(() => import('./views/SystemSettingsView').then(m => ({ default: m.SystemSettingsView })));
const WhatsappSwarmView = lazy(() => import('./views/WhatsappSwarmView').then(m => ({ default: m.WhatsappSwarmView })));
const MagicShotStudioView = lazy(() => import('./views/MagicShotStudioView').then(m => ({ default: m.MagicShotStudioView })));
const AgentStudioView = lazy(() => import('./views/AgentStudioView').then(m => ({ default: m.AgentStudioView })));
const EquipmentPrintHubView = lazy(() => import('./views/EquipmentPrintHubView').then(m => ({ default: m.EquipmentPrintHubView })));
const SleepingMoneyRecoveryView = lazy(() => import('./views/SleepingMoneyRecoveryView').then(m => ({ default: m.SleepingMoneyRecoveryView })));
const KeepsakeStoreView = lazy(() => import('./views/KeepsakeStoreView').then(m => ({ default: m.KeepsakeStoreView })));
const AiCoachBlogView = lazy(() => import('./views/AiCoachBlogView').then(m => ({ default: m.AiCoachBlogView })));
const AutonomousCeo = lazy(() => import('./pages/AutonomousCeo').then(m => ({ default: m.AutonomousCeo })));
const FranchiseOverview = lazy(() => import('./pages/FranchiseOverview').then(m => ({ default: m.FranchiseOverview })));
const IngestionStudioPage = lazy(() => import('./modules/ingestion-studio/IngestionStudioPage').then(m => ({ default: m.IngestionStudioPage })));

type TabPath = '/' | '/franchise' | '/fleet' | '/equipment' | '/staff' | '/customers' | '/galleries' | '/keepsakes' | '/pricing' | '/magic-shots' | '/ai-command' | '/agent-studio' | '/ai-coach' | '/autonomous-ceo' | '/whatsapp-swarm' | '/sleeping-money' | '/ingestion-studio' | '/financials' | '/settings';

interface NavItem {
  path: TabPath;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Operations & Fleet',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/fleet', label: 'Live Ops', icon: MonitorSmartphone },
      { path: '/equipment', label: 'Equipment & Print Hub', icon: Camera },
      { path: '/ingestion-studio', label: 'Ingestion Studio', icon: HardDrive },
    ]
  },
  {
    title: 'Staff & CRM',
    items: [
      { path: '/staff', label: 'Staff & HR', icon: Users },
      { path: '/customers', label: 'CRM', icon: UserCircle },
      { path: '/franchise', label: 'Franchise Overview', icon: Activity },
    ]
  },
  {
    title: 'Revenue & Closers',
    items: [
      { path: '/sleeping-money', label: 'Sleeping Money Recovery', icon: CircleDollarSign },
      { path: '/whatsapp-swarm', label: 'WhatsApp Swarm', icon: MessageCircle },
      { path: '/financials', label: 'Financials', icon: CreditCard },
      { path: '/pricing', label: 'Pricing & Products', icon: Tag },
    ]
  },
  {
    title: 'AI & VFX Studio',
    items: [
      { path: '/magic-shots', label: 'Magic Shot VFX', icon: Sparkles },
      { path: '/keepsakes', label: 'Keepsake Store & Reviews', icon: Gift },
      { path: '/ai-coach', label: 'AI Coach & SEO Blog', icon: SparklesIcon },
      { path: '/ai-command', label: 'AI Command', icon: Bot },
      { path: '/agent-studio', label: 'Agent Studio', icon: Bot },
      { path: '/autonomous-ceo', label: 'Autonomous CEO', icon: Activity },
    ]
  },
  {
    title: 'System & HQ',
    items: [
      { path: '/galleries', label: 'Galleries', icon: Images },
      { path: '/settings', label: 'System Settings', icon: Settings },
    ]
  }
];

const allNavItems = navGroups.flatMap(g => g.items);

function ViewLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-2">
      <div className="flex items-center justify-between">
        <div className="h-8 w-64 bg-slate-800/80 rounded-lg"></div>
        <div className="h-8 w-32 bg-slate-800/60 rounded-lg"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-32 bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6 flex flex-col justify-between">
          <div className="h-4 w-24 bg-slate-800 rounded"></div>
          <div className="h-8 w-36 bg-slate-800/80 rounded"></div>
        </div>
        <div className="h-32 bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6 flex flex-col justify-between">
          <div className="h-4 w-24 bg-slate-800 rounded"></div>
          <div className="h-8 w-36 bg-slate-800/80 rounded"></div>
        </div>
        <div className="h-32 bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6 flex flex-col justify-between">
          <div className="h-4 w-24 bg-slate-800 rounded"></div>
          <div className="h-8 w-36 bg-slate-800/80 rounded"></div>
        </div>
      </div>
      <div className="h-96 bg-slate-900/40 border border-slate-800/50 rounded-2xl flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span>Loading module view...</span>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ currentPath, onNavigate }: { currentPath: TabPath; onNavigate: (path: TabPath) => void }) {
  const { logout } = useAuth();

  return (
    <div className="w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/80 h-full flex flex-col">
      <div className="p-5 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            CF
          </div>
          <div>
            <h1 className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
              ClickFlash CEO
            </h1>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Management Command Hub</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {group.title}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                    isActive 
                      ? 'bg-blue-600/90 text-white shadow-md shadow-blue-600/20 font-semibold' 
                      : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-slate-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">CEO</p>
              <p className="text-xs text-slate-400">Admin</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MainLayout({ 
  currentPath, 
  onNavigate, 
  children 
}: { 
  currentPath: TabPath; 
  onNavigate: (path: TabPath) => void; 
  children: ReactNode 
}) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden">
      <Sidebar currentPath={currentPath} onNavigate={onNavigate} />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const [currentPath, setCurrentPath] = useState<TabPath>(() => {
    const hash = window.location.hash.replace('#', '') as TabPath;
    return allNavItems.some(i => i.path === hash) ? hash : '/';
  });

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '') as TabPath;
      if (allNavItems.some(i => i.path === hash)) {
        setCurrentPath(hash);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleNavigate = (path: TabPath) => {
    setCurrentPath(path);
    window.location.hash = path;
  };

  const renderView = () => {
    switch (currentPath) {
      case '/': return <DashboardView />;
      case '/franchise': return <FranchiseOverview />;
      case '/fleet': return <FleetView />;
      case '/equipment': return <EquipmentPrintHubView />;
      case '/staff': return <StaffView />;
      case '/customers': return <CustomerView />;
      case '/galleries': return <GalleriesView />;
      case '/keepsakes': return <KeepsakeStoreView />;
      case '/pricing': return <PricingView />;
      case '/magic-shots': return <MagicShotStudioView />;
      case '/ai-coach': return <AiCoachBlogView />;
      case '/ai-command': return <AICommandView />;
      case '/agent-studio': return <AgentStudioView />;
      case '/autonomous-ceo': return <AutonomousCeo />;
      case '/whatsapp-swarm': return <WhatsappSwarmView />;
      case '/sleeping-money': return <SleepingMoneyRecoveryView />;
      case '/ingestion-studio': return <IngestionStudioPage />;
      case '/financials': return <FinancialsView />;
      case '/settings': return <SystemSettingsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <AuthProvider>
      <MainLayout currentPath={currentPath} onNavigate={handleNavigate}>
        <Suspense fallback={<ViewLoadingSkeleton />}>
          {renderView()}
        </Suspense>
      </MainLayout>
    </AuthProvider>
  );
}

