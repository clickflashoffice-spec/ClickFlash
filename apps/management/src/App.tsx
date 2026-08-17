import { useState, type ReactNode } from 'react';
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
  Sparkles
} from 'lucide-react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { FleetView } from './views/FleetView';
import { StaffView } from './views/StaffView';
import { CustomerView } from './views/CustomerView';
import { GalleriesView } from './views/GalleriesView';
import { PricingView } from './views/PricingView';
import { AICommandView } from './views/AICommandView';
import { FinancialsView } from './views/FinancialsView';
import { SystemSettingsView } from './views/SystemSettingsView';
import { WhatsappSwarmView } from './views/WhatsappSwarmView';
import { MagicShotStudioView } from './views/MagicShotStudioView';
import { AutonomousCeo } from './pages/AutonomousCeo';
import { FranchiseOverview } from './pages/FranchiseOverview';

type TabPath = '/' | '/fleet' | '/staff' | '/customers' | '/galleries' | '/pricing' | '/magic-shots' | '/ai-command' | '/whatsapp-swarm' | '/autonomous-ceo' | '/financials' | '/settings' | '/franchise';

interface NavItem {
  path: TabPath;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/franchise', label: 'Franchise Overview', icon: Activity },
  { path: '/fleet', label: 'Live Ops', icon: MonitorSmartphone },
  { path: '/staff', label: 'Staff & HR', icon: Users },
  { path: '/customers', label: 'CRM', icon: UserCircle },
  { path: '/galleries', label: 'Galleries', icon: Images },
  { path: '/pricing', label: 'Pricing & Products', icon: Tag },
  { path: '/magic-shots', label: 'Magic Shot VFX', icon: Sparkles },
  { path: '/ai-command', label: 'AI Command', icon: Bot },
  { path: '/autonomous-ceo', label: 'Autonomous CEO', icon: Activity },
  { path: '/whatsapp-swarm', label: 'WhatsApp Swarm', icon: MessageCircle },
  { path: '/financials', label: 'Financials', icon: CreditCard },
  { path: '/settings', label: 'System Settings', icon: Settings },
];

function Sidebar({ currentPath, onNavigate }: { currentPath: TabPath; onNavigate: (path: TabPath) => void }) {
  const { logout } = useAuth();

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 h-full flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
          ClickFlash CEO
        </h1>
        <p className="text-xs text-slate-400 mt-1">Management Hub</p>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;
          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
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
    return navItems.some(i => i.path === hash) ? hash : '/';
  });

  const handleNavigate = (path: TabPath) => {
    setCurrentPath(path);
    window.location.hash = path;
  };

  const renderView = () => {
    switch (currentPath) {
      case '/': return <DashboardView />;
      case '/franchise': return <FranchiseOverview />;
      case '/fleet': return <FleetView />;
      case '/staff': return <StaffView />;
      case '/customers': return <CustomerView />;
      case '/galleries': return <GalleriesView />;
      case '/pricing': return <PricingView />;
      case '/magic-shots': return <MagicShotStudioView />;
      case '/ai-command': return <AICommandView />;
      case '/autonomous-ceo': return <AutonomousCeo />;
      case '/whatsapp-swarm': return <WhatsappSwarmView />;
      case '/financials': return <FinancialsView />;
      case '/settings': return <SystemSettingsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <AuthProvider>
      <MainLayout currentPath={currentPath} onNavigate={handleNavigate}>
        {renderView()}
      </MainLayout>
    </AuthProvider>
  );
}

