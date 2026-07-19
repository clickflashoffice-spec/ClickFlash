import React, { useState } from 'react';
import Modal from '../common/Modal.tsx';
import { logger } from '../../utils/logger';
import OnScreenKeyboard from './OnScreenKeyboard';

interface PasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (password: string) => Promise<boolean>;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!password || isSubmitting) return;
        setIsSubmitting(true);
        setError('');

        try {
            const success = await onSubmit(password);
            if (success) {
                resetState();
                return;
            }
            setError('Incorrect password. Please try again.');
            setPassword('');
        } catch (submitError) {
            logger.error('Failed to validate kiosk exit password', submitError);
            setError('Unable to validate the password. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const resetState = () => {
        setPassword('');
        setError('');
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Administrator Access" size="lg">
            <div className="flex flex-col items-center space-y-6">
                <p className="text-slate-500 dark:text-slate-400">Please enter the administrator password to access settings.</p>
                <input
                    type="password"
                    readOnly
                    value={password}
                    data-testid="admin-password-input"
                    className="w-full h-16 bg-slate-100 dark:bg-slate-900 rounded-lg text-center text-4xl tracking-widest text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />

                {error && <p className="text-red-500">{error}</p>}

                <OnScreenKeyboard value={password} onChange={setPassword} />

                <div className="w-full flex space-x-4 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={handleClose} className="flex-1 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold py-3 px-6 rounded-lg text-xl transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={() => void handleSubmit()}
                        disabled={isSubmitting || password.length === 0}
                        data-testid="admin-password-submit"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg text-xl transition-colors"
                    >
                        {isSubmitting ? 'Validating…' : 'Submit'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default PasswordModal;
