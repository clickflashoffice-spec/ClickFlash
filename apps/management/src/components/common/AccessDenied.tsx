import React from 'react';
import { Card } from "@clickflash/ui";

const AccessDenied: React.FC = () => {
    return (
        <div className="flex items-center justify-center h-full">
            <Card className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                    <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                </div>
                <h1 className="mt-4 text-2xl font-bold text-red-500 dark:text-red-400">Access Denied</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                    You do not have the required permissions to view this page.
                </p>
            </Card>
        </div>
    );
};

export default AccessDenied;