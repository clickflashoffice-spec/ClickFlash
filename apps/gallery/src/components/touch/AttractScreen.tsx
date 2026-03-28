
import React from 'react';

interface AttractScreenProps {
    onDismiss: () => void;
    logoUrl: string;
}

const AttractScreen: React.FC<AttractScreenProps> = ({ onDismiss, logoUrl }) => {
    return (
        <div 
            onClick={onDismiss}
            className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center cursor-pointer overflow-hidden"
        >
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-slate-900 to-purple-900 animate-gradient-slow opacity-60"></div>
            
            {/* Floating Particles/Decorators */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float-delayed"></div>

            <div className="relative z-10 flex flex-col items-center animate-pulse-slow">
                <div className="p-6 bg-white/5 backdrop-blur-xl rounded-full mb-8 border border-white/10 shadow-2xl ring-1 ring-white/20">
                    <img src={logoUrl} alt="Logo" className="w-40 h-40 rounded-full object-cover" />
                </div>
                <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight drop-shadow-2xl text-center mb-6">
                    Star Master <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Photography</span>
                </h1>
                <div className="px-8 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xl md:text-2xl text-white font-light tracking-widest uppercase shadow-lg">
                    Touch Screen to Start
                </div>
            </div>
            
            <style>{`
                @keyframes gradient-slow {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient-slow {
                    background-size: 200% 200%;
                    animation: gradient-slow 15s ease infinite;
                }
                @keyframes pulse-slow {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.02); opacity: 0.9; }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 4s ease-in-out infinite;
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
                 @keyframes float-delayed {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(20px); }
                }
                .animate-float { animation: float 6s ease-in-out infinite; }
                .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }
            `}</style>
        </div>
    );
};

export default AttractScreen;
