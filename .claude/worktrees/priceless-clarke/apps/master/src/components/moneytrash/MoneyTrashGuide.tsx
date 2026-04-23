import React from 'react';

interface MoneyTrashGuideProps {
    retentionDays: number;
    price: number;
}

export const MoneyTrashGuide: React.FC<MoneyTrashGuideProps> = ({ retentionDays, price }) => {
    return (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-800/30">
            <h3 className="font-bold text-indigo-900 dark:text-indigo-100 mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                How MoneyTrash Works
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-4">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mb-2">
                        <span className="text-indigo-600 dark:text-indigo-300 font-bold text-sm">1</span>
                    </div>
                    <h4 className="font-medium text-indigo-900 dark:text-indigo-100 mb-1">Detection</h4>
                    <p className="text-sm text-indigo-800 dark:text-indigo-200">
                        System scans for photos older than <strong>{retentionDays} days</strong> in finalized albums.
                    </p>
                </div>
                <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-4">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mb-2">
                        <span className="text-indigo-600 dark:text-indigo-300 font-bold text-sm">2</span>
                    </div>
                    <h4 className="font-medium text-indigo-900 dark:text-indigo-100 mb-1">Processing</h4>
                    <p className="text-sm text-indigo-800 dark:text-indigo-200">
                        Unsold photos are watermarked and prepared for cloud upload.
                    </p>
                </div>
                <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-4">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mb-2">
                        <span className="text-indigo-600 dark:text-indigo-300 font-bold text-sm">3</span>
                    </div>
                    <h4 className="font-medium text-indigo-900 dark:text-indigo-100 mb-1">Monetization</h4>
                    <p className="text-sm text-indigo-800 dark:text-indigo-200">
                        Customers receive email with purchase link to buy photos at <strong>€{price.toFixed(2)}</strong> each.
                    </p>
                </div>
            </div>
        </div>
    );
};
