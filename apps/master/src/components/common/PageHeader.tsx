import React from 'react';

interface PageHeaderProps {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}

/**
 * PageHeader Component
 * 
 * A standardized header for all main pages in the Master application.
 * Ensures consistent spacing, typography, and responsive layout.
 */
const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, className = '' }) => {
    return (
        <div className={`flex flex-col xl:flex-row justify-between items-start gap-4 sm:gap-5 md:gap-6 mb-5 sm:mb-6 md:mb-8 ${className}`}>
            <div className="flex-1 w-full">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                    {title}
                </h1>
                {subtitle && (
                    <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
                        {subtitle}
                    </div>
                )}
            </div>

            {actions && (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full xl:w-auto flex-shrink-0 mt-2 xl:mt-0">
                    {actions}
                </div>
            )}
        </div>
    );
};

export default PageHeader;
