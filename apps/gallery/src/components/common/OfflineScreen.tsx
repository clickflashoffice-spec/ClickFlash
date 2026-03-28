
import React from 'react';

interface OfflineScreenProps {
  portalName: string;
  onBack?: () => void;
}

const OfflineScreen: React.FC<OfflineScreenProps> = ({ portalName, onBack }) => {
  
  const handleNavigation = () => {
      // Reloading clears the routing state and should return to the entry point
      window.location.reload();
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-50 dark:bg-slate-900 text-center p-8 font-sans">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-full mb-8 shadow-2xl border border-slate-100 dark:border-slate-700">
            <div className="relative">
                 {/* Inline SVG for Wifi Off - Safe for offline */}
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="absolute -bottom-2 -right-2 bg-red-500 text-white p-1.5 rounded-full border-4 border-white dark:border-slate-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
            </div>
        </div>
        
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-3">Connection Required</h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-md mb-10 leading-relaxed">
            The <strong>{portalName}</strong> connects to the central cloud database and requires an active internet connection to function.
        </p>
        
        <div className="space-y-4 w-full max-w-sm">
            <div className="flex items-center justify-center space-x-4 mb-6">
                <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Available Offline</span>
                <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
            </div>
            
            <button onClick={handleNavigation} className="w-full flex items-center p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all text-left group cursor-pointer">
                <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-3 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <div>
                    <div className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">Return to Launcher</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Launch Master Portal or Kiosk</div>
                </div>
            </button>
        </div>
    </div>
  );
};

export default OfflineScreen;
