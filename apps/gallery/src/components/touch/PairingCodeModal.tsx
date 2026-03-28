
import React, { useState } from 'react';
import Modal from '../common/Modal.tsx';
import OnScreenKeyboard from './OnScreenKeyboard';

interface PairingCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (code: string) => void;
}

const PairingCodeModal: React.FC<PairingCodeModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [code, setCode] = useState('');

    const handleConfirm = () => {
        if (code) {
            // Sanitize code to match the 'word-word-word' format expected by the system
            const sanitizedCode = code.toLowerCase().trim().replace(/\s+/g, '-');
            onConfirm(sanitizedCode);
        }
    };

    const handleClose = () => {
        setCode('');
        onClose();
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Connect to Master" size="lg">
            <div className="flex flex-col items-center space-y-6 p-4">
                 <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 text-center w-full">
                     <p className="text-blue-800 dark:text-blue-200 font-medium text-lg">Enter the 3-word code</p>
                     <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">Found on the Master Portal under Settings &gt; Kiosks</p>
                 </div>

                 <input
                    type="text"
                    readOnly
                    value={code}
                    placeholder="word-word-word"
                    className="w-full h-24 bg-slate-100 dark:bg-slate-900 rounded-xl text-center text-4xl font-mono font-bold tracking-widest text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-700 placeholder-slate-400 dark:placeholder-slate-600 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all"
                />
                
                <div className="w-full">
                    <OnScreenKeyboard value={code} onChange={setCode} />
                </div>

                 <div className="w-full flex space-x-4 pt-6 border-t border-slate-200 dark:border-slate-700">
                     <button onClick={handleClose} className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold py-4 px-8 rounded-xl text-xl transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirm} 
                        disabled={!code || code.length < 5}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl text-xl transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed shadow-lg"
                    >
                        Connect
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default PairingCodeModal;
