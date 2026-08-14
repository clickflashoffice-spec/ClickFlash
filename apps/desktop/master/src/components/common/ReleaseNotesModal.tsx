
import React from 'react';
import { Modal } from '@clickflash/ui';

interface ReleaseNotesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ReleaseNotesModal: React.FC<ReleaseNotesModalProps> = ({ isOpen, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="What's New in Star Master OS v3.1.1" size="lg">
            <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-bold mb-2">Enterprise Level 4 Upgrade</h3>
                    <p className="opacity-90">
                        Welcome to the most advanced version of Star Master OS yet. We've integrated AI, enhanced security, and streamlined hardware workflows.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center space-x-2 mb-2">
                            <span className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                            </span>
                            <h4 className="font-bold text-slate-900 dark:text-white">AI Face Search</h4>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Guests can now find their photos instantly by taking a selfie on the Kiosk. Powered by local biometrics for privacy.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center space-x-2 mb-2">
                            <span className="p-2 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a1 1 0 01-.666.935l-.7.233A.996.996 0 003 7c0 1.3.896 2.4 2.154 2.654C6.876 10.014 8 11.96 8 14c0 2.266-1.79 4.212-4.207 4.832A2 2 0 011 17h18a2 2 0 01-2.793 1.832C13.79 18.212 12 16.266 12 14c0-2.04 1.124-3.985 2.846-4.346C16.104 9.4 17 8.3 17 7a1 1 0 00-1-1 1 1 0 00-1 1v.59c0 .281-.232.504-.512.488A6.013 6.013 0 008 4a6.013 6.013 0 00-6.488 4.078C1.28 7.832 1 7.553 1 7.271V3a1 1 0 011-1h2z" clipRule="evenodd" /></svg>
                            </span>
                            <h4 className="font-bold text-slate-900 dark:text-white">Generative AI Edit</h4>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Remove unwanted objects or enhance lighting with natural language prompts in the editor.
                        </p>
                    </div>
                    
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center space-x-2 mb-2">
                            <span className="p-2 bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
                            </span>
                            <h4 className="font-bold text-slate-900 dark:text-white">Smart Workflow</h4>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Auto-cull blurry photos, one-click lab printing worksheets, and integrated digital delivery tracking.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-transform active:scale-95">
                        Get Started
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ReleaseNotesModal;
