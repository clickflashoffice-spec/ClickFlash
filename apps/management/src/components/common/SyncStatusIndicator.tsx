

import React, { useState, useEffect } from 'react';
import useLocalStorage from '../../hooks/useLocalStorage.ts';

interface SyncStatusIndicatorProps {
    connectionStatus: 'Connected' | 'Disconnected' | 'Reconnecting';
    isOnline: boolean;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ connectionStatus, isOnline }) => {

    const getStatusInfo = () => {
        if (!isOnline) {
            return { text: 'Offline', color: 'text-red-500', icon: '✗' };
        }

        switch (connectionStatus) {
            case 'Connected':
                return { text: 'Live Sync Active', color: 'text-emerald-600', icon: '●' };
            case 'Reconnecting':
                return { text: 'Reconnecting...', color: 'text-amber-500', icon: '⟳' };
            case 'Disconnected':
            default:
                return { text: 'Polling Mode', color: 'text-slate-400', icon: '○' };
        }
    };

    const { text, color, icon } = getStatusInfo();

    return (
        <div className={`flex items-center space-x-2 text-sm font-semibold transition-colors duration-300 ${color}`}>
            <span className={`text-[10px] ${connectionStatus === 'Reconnecting' ? 'animate-spin' : 'animate-pulse'}`}>{icon}</span>
            <span>{text}</span>
        </div>
    );
};

export default SyncStatusIndicator;