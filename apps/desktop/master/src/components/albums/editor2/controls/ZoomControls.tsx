
import React from 'react';
import { Maximize, Target } from 'lucide-react';

interface ZoomControlsProps {
    scale: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
    onFitToScreen?: () => void;
    onActualPixels?: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
    scale,
    onZoomIn,
    onZoomOut,
    onReset,
    onFitToScreen,
    onActualPixels,
}) => {
    // Format scale as percentage
    const percentage = Math.round(scale * 100);
    
    // Check bounds
    const isMinZoom = percentage <= 10;
    const isMaxZoom = percentage >= 500;
    const isDefaultZoom = percentage === 100;
    const isActualPixels = Math.abs(scale - 1) < 0.01;

    return (
        <div className="absolute bottom-4 right-4 flex flex-col items-center gap-1 bg-white/95 backdrop-blur-sm rounded-lg p-1.5 shadow-lg border border-gray-200">
            {/* Zoom In */}
            <button
                onClick={onZoomIn}
                disabled={isMaxZoom}
                className="w-8 h-8 flex items-center justify-center rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Zoom In (Ctrl + +)"
                aria-label="Zoom in"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
            </button>

            {/* Current Zoom Percentage */}
            <div 
                className={`w-12 h-8 flex items-center justify-center text-xs font-bold rounded-md cursor-pointer transition-colors ${
                    isDefaultZoom 
                        ? 'text-gray-400' 
                        : 'text-blue-600 hover:bg-blue-50'
                }`}
                onClick={onReset}
                title={isDefaultZoom ? 'Current Zoom' : 'Click to Reset (Ctrl + 0)'}
                role="button"
                aria-label={`Current zoom ${percentage} percent. Click to reset`}
            >
                {percentage}%
            </div>

            {/* Zoom Out */}
            <button
                onClick={onZoomOut}
                disabled={isMinZoom}
                className="w-8 h-8 flex items-center justify-center rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Zoom Out (Ctrl + -)"
                aria-label="Zoom out"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
            </button>

            {/* Divider */}
            <div className="w-6 h-px bg-gray-200 my-0.5"></div>

            {/* Fit to Screen */}
            {onFitToScreen && (
                <button
                    onClick={onFitToScreen}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Fit to Screen (F)"
                    aria-label="Fit image to screen"
                >
                    <Maximize className="h-4 w-4" aria-hidden="true" />
                </button>
            )}

            {/* Actual Pixels (1:1) */}
            {onActualPixels && (
                <button
                    onClick={onActualPixels}
                    disabled={isActualPixels}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-gray-600 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Actual Pixels (1:1)"
                    aria-label="View actual pixels"
                >
                    <Target className="h-4 w-4" aria-hidden="true" />
                </button>
            )}

            {/* Reset */}
            <button
                onClick={onReset}
                disabled={isDefaultZoom}
                className="w-8 h-8 flex items-center justify-center rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Reset Zoom (Double-click canvas or Ctrl + 0)"
                aria-label="Reset zoom"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
    );
};

export default ZoomControls;
