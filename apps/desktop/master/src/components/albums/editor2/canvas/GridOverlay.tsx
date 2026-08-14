import React from 'react';

interface GridOverlayProps {
    visible: boolean;
    type?: 'rule-of-thirds' | 'fine';
    opacity?: number;
}

export const GridOverlay: React.FC<GridOverlayProps> = ({
    visible,
    type = 'rule-of-thirds',
    opacity = 0.4
}) => {
    if (!visible) return null;

    return (
        <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-200"
            style={{ opacity: visible ? opacity : 0 }}
        >
            {/* Horizontal Lines */}
            <div className="absolute top-1/3 left-0 w-full h-[1px] bg-white/50 shadow-sm" />
            <div className="absolute top-2/3 left-0 w-full h-[1px] bg-white/50 shadow-sm" />

            {/* Vertical Lines */}
            <div className="absolute left-1/3 top-0 h-full w-[1px] bg-white/50 shadow-sm" />
            <div className="absolute left-2/3 top-0 h-full w-[1px] bg-white/50 shadow-sm" />

            {type === 'fine' && (
                <>
                    {/* Finer grid lines if needed */}
                    <div className="absolute top-1/6 left-0 w-full h-[1px] bg-white/20" />
                    <div className="absolute top-3/6 left-0 w-full h-[1px] bg-white/20" />
                    <div className="absolute top-5/6 left-0 w-full h-[1px] bg-white/20" />
                    <div className="absolute left-1/6 top-0 h-full w-[1px] bg-white/20" />
                    <div className="absolute left-3/6 top-0 h-full w-[1px] bg-white/20" />
                    <div className="absolute left-5/6 top-0 h-full w-[1px] bg-white/20" />
                </>
            )}
        </div>
    );
};
