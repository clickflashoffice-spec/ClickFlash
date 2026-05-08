import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Lock, X, AlertCircle, Loader2 } from 'lucide-react';
import { securityService } from '../../services/api/securityService';

interface AdminPINChallengeProps {
    onSuccess: () => void;
    onCancel: () => void;
}

const AdminPINChallenge: React.FC<AdminPINChallengeProps> = ({ onSuccess, onCancel }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = useCallback(async (currentPin: string) => {
        if (isProcessing) return;
        
        setIsProcessing(true);
        setError(false);
        
        try {
            const isValid = await securityService.verifyAdminPin(currentPin);
            
            if (isValid) {
                onSuccess();
            } else {
                setError(true);
                setShake(true);
                setPin('');
                setTimeout(() => setShake(false), 500);
            }
        } catch (err) {
            setError(true);
            setPin('');
            console.error('[AdminPIN] Verification failed:', err);
        } finally {
            setIsProcessing(false);
        }
    }, [isProcessing, onSuccess]);

    const handleNumberClick = (num: string) => {
        if (pin.length < 4) {
            setPin(prev => prev + num);
        }
    };

    useEffect(() => {
        if (pin.length === 4) {
            handleSubmit(pin);
        }
    }, [pin, handleSubmit]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm animate-in fade-in duration-300">
            <div className={`
                w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden
                ${shake ? 'animate-bounce' : ''} 
                border border-slate-200 dark:border-slate-700
            `}>
                <div className="p-8 text-center">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-6">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Admin Identity Challenge</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 px-4">
                        Rule 16 Enforced: This area contains sensitive fleet configurations. Please verify your administrative PIN.
                    </p>

                    <div className="flex justify-center gap-3 mb-8">
                        {[0, 1, 2, 3].map((i) => (
                            <div 
                                key={i}
                                className={`
                                    w-4 h-4 rounded-full border-2 transition-all duration-200
                                    ${pin.length > i 
                                        ? 'bg-cyan-500 border-cyan-500 scale-110 shadow-lg shadow-cyan-500/50' 
                                        : 'border-slate-300 dark:border-slate-600'
                                    }
                                `}
                            />
                        ))}
                    </div>

                    {error && (
                        <div className="flex items-center justify-center gap-2 text-red-500 text-sm font-medium mb-6 animate-in slide-in-from-top-2">
                            <AlertCircle className="w-4 h-4" />
                            <span>Invalid PIN. Access identity logged.</span>
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'clear'].map((btn, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    if (btn === 'clear') setPin('');
                                    else if (btn !== '') handleNumberClick(btn);
                                }}
                                disabled={btn === '' || isProcessing}
                                className={`
                                    h-16 rounded-2xl text-xl font-bold transition-all relative
                                    ${btn === '' ? 'opacity-0 cursor-default' : 
                                      btn === 'clear' ? 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10' :
                                      'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95'}
                                `}
                            >
                                {btn === 'clear' ? <X className="mx-auto w-6 h-6" /> : btn}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <button 
                        onClick={onCancel}
                        className="text-sm font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-4 py-2 transition-colors"
                    >
                        Return to Safety
                    </button>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        {isProcessing ? (
                            <Loader2 className="w-3 h-3 animate-spin text-cyan-500" />
                        ) : (
                            <Lock className="w-3 h-3" />
                        )}
                        AES-256 ENFORCED
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPINChallenge;
