import React from 'react';
import { Card } from '@clickflash/ui';

interface AccessDeniedProps {
    permission?: string;
    role?: string;
    page?: string;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({ permission, role, page }) => {
    return (
        <div className="flex items-center justify-center h-full p-4">
            <Card className="text-center max-w-md">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                    <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                </div>
                <h1 className="mt-4 text-2xl font-bold text-red-500 dark:text-red-400">Access Denied</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                    You do not have the required permissions to view this page.
                </p>
                {(permission || role || page) && (
                    <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-left text-sm">
                        <p className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Details:</p>
                        {page && (
                            <p className="text-slate-600 dark:text-slate-400">
                                <span className="font-medium">Page:</span> {page}
                            </p>
                        )}
                        {permission && (
                            <p className="text-slate-600 dark:text-slate-400">
                                <span className="font-medium">Required Permission:</span> {permission}
                            </p>
                        )}
                        {role && (
                            <p className="text-slate-600 dark:text-slate-400">
                                <span className="font-medium">Your Role:</span> {role}
                            </p>
                        )}
                        <p className="text-slate-500 dark:text-slate-500 text-xs mt-2">
                            Please contact an administrator if you believe you should have access to this page.
                        </p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default AccessDenied;