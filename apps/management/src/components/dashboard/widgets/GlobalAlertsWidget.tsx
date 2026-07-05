
import React, { useMemo } from 'react';
import { Order, Album } from '../../../types.ts';

interface GlobalAlertsWidgetProps {
    orders: Order[];
    albums: Album[];
    detailed?: boolean;
    showSystemAlerts?: boolean;
}

interface Alert {
    id: string;
    type: 'warning' | 'error' | 'info';
    title: string;
    message: string;
    timestamp: string;
    action?: string;
}

/**
 * GlobalAlertsWidget Component
 * 
 * Displays critical alerts and notifications requiring attention.
 * 
 * @param {GlobalAlertsWidgetProps} props - Component props
 */
const GlobalAlertsWidget: React.FC<GlobalAlertsWidgetProps> = ({
    orders,
    albums,
    detailed = false,
    showSystemAlerts = false
}) => {
    const alerts = useMemo(() => {
        const generatedAlerts: Alert[] = [];

        // High priority: Many pending orders
        const pendingOrders = orders.filter(o => o.status === 'Pending');
        if (pendingOrders.length > 20) {
            generatedAlerts.push({
                id: 'pending-orders',
                type: 'warning',
                title: 'High Pending Order Volume',
                message: `${pendingOrders.length} orders awaiting fulfillment`,
                timestamp: new Date().toISOString(),
                action: 'View Orders'
            });
        }

        // High priority: Many albums to process
        const albumsToProcess = albums.filter(a => a.status !== 'Finalized' && a.status !== 'Archived');
        if (albumsToProcess.length > 30) {
            generatedAlerts.push({
                id: 'albums-backlog',
                type: 'warning',
                title: 'Album Processing Backlog',
                message: `${albumsToProcess.length} albums need processing`,
                timestamp: new Date().toISOString(),
                action: 'View Albums'
            });
        }

        // Error: Orders stuck in processing > 24 hours
        const stuckOrders = orders.filter(o => {
            if (o.status !== 'Processing') return false;
            const orderDate = new Date(o.date);
            const hoursSince = (Date.now() - orderDate.getTime()) / (1000 * 60 * 60);
            return hoursSince > 24;
        });
        if (stuckOrders.length > 0) {
            generatedAlerts.push({
                id: 'stuck-orders',
                type: 'error',
                title: 'Stuck Orders',
                message: `${stuckOrders.length} orders stuck in processing > 24h`,
                timestamp: new Date().toISOString(),
                action: 'Investigate'
            });
        }

        // Warning: Low photo volume today
        const todayAlbums = albums.filter(a => a.date === new Date().toISOString().split('T')[0]);
        const todayPhotos = todayAlbums.reduce((sum, a) => sum + (a.photos?.length || 0), 0);
        if (todayPhotos < 50 && new Date().getHours() > 12) {
            generatedAlerts.push({
                id: 'low-photos',
                type: 'info',
                title: 'Low Photo Volume Today',
                message: `Only ${todayPhotos} photos captured so far`,
                timestamp: new Date().toISOString()
            });
        }

        return generatedAlerts.sort((a, b) => {
            const priority = { error: 0, warning: 1, info: 2 };
            return priority[a.type] - priority[b.type];
        });
    }, [orders, albums]);

    const getAlertStyles = (type: string) => {
        switch (type) {
            case 'error':
                return 'bg-red-50 border-red-200 text-red-800';
            case 'warning':
                return 'bg-amber-50 border-amber-200 text-amber-800';
            case 'info':
                return 'bg-blue-50 border-blue-200 text-blue-800';
            default:
                return 'bg-slate-50 border-slate-200';
        }
    };

    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'error':
                return (
                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'warning':
                return (
                    <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                );
            case 'info':
                return (
                    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Alerts & Notifications</h3>
                    <p className="text-sm text-slate-500">Items requiring attention</p>
                </div>
                {alerts.length > 0 && (
                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${alerts.some(a => a.type === 'error') ? 'bg-red-100 text-red-700' :
                            alerts.some(a => a.type === 'warning') ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-100 text-blue-700'
                        }`}>
                        {alerts.length} Alert{alerts.length !== 1 ? 's' : ''}
                    </div>
                )}
            </div>

            <div className={`space-y-3 ${detailed ? 'max-h-96 overflow-y-auto' : ''}`}>
                {alerts.length > 0 ? (
                    alerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`flex items-start space-x-3 p-3 rounded-lg border ${getAlertStyles(alert.type)}`}
                        >
                            {getAlertIcon(alert.type)}
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold">{alert.title}</p>
                                    <span className="text-xs opacity-70">
                                        {new Date(alert.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <p className="text-xs mt-1 opacity-90">{alert.message}</p>
                                {alert.action && detailed && (
                                    <button className="mt-2 text-xs font-semibold underline hover:no-underline">
                                        {alert.action}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-slate-500">
                        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>All systems operational</p>
                        <p className="text-xs mt-1">No alerts at this time</p>
                    </div>
                )}
            </div>

            {showSystemAlerts && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">System Alerts</h4>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600">Database Backup</span>
                            <span className="text-green-600">✓ Last: 2 hours ago</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600">Storage Capacity</span>
                            <span className="text-amber-600">⚠ 75% full</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600">API Latency</span>
                            <span className="text-green-600">✓ 45ms avg</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

GlobalAlertsWidget.displayName = 'GlobalAlertsWidget';
export default React.memo(GlobalAlertsWidget);

