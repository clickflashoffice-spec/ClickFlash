import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router';
import { 
  LayoutDashboard, 
  MonitorSmartphone, 
  Users, 
  UserCircle, 
  Tag, 
  Bot, 
  CreditCard,
  Images
} from 'lucide-react';

function Sidebar() {
  const location = useLocation();
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/fleet', label: 'Fleet & Ops', icon: MonitorSmartphone },
    { path: '/staff', label: 'Staff & HR', icon: Users },
    { path: '/customers', label: 'CRM', icon: UserCircle },
    { path: '/galleries', label: 'Galleries', icon: Images },
    { path: '/pricing', label: 'Pricing & Products', icon: Tag },
    { path: '/ai-command', label: 'AI Command', icon: Bot },
    { path: '/financials', label: 'Financials', icon: CreditCard },
  ];

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
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
            <UserCircle className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">CEO</p>
            <p className="text-xs text-slate-400">Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}

import { DashboardView } from './views/DashboardView';
import { FleetView } from './views/FleetView';
import { StaffView } from './views/StaffView';
import { CustomerView } from './views/CustomerView';
import { GalleriesView } from './views/GalleriesView';
import { PricingView } from './views/PricingView';
import { AICommandView } from './views/AICommandView';
import { FinancialsView } from './views/FinancialsView';

export default function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<DashboardView />} />
          <Route path="/fleet" element={<FleetView />} />
          <Route path="/staff" element={<StaffView />} />
          <Route path="/customers" element={<CustomerView />} />
          <Route path="/galleries" element={<GalleriesView />} />
          <Route path="/pricing" element={<PricingView />} />
          <Route path="/ai-command" element={<AICommandView />} />
          <Route path="/financials" element={<FinancialsView />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}
