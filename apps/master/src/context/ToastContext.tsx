import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import Toast from '../components/common/Toast';

interface ToastContextType {
    showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const showToast = useCallback((message: string) => {
        setToastMessage(message);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        // We'll let the Toast component handle its own timeout if we want,
        // but for now we follow the App.tsx pattern and use internal tracking.
        toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3300); // 3000 + 300 for animation
    }, []);

    const handleClose = useCallback(() => {
        setToastMessage(null);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toastMessage && (
                <Toast
                    message={toastMessage}
                    onClose={handleClose}
                />
            )}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
