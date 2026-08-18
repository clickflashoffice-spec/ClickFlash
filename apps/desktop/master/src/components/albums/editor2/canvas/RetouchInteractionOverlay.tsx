import React, { useMemo } from 'react';

interface RetouchInteractionOverlayProps {
    step: 'target' | 'source' | 'idle';
    target: { x: number; y: number } | null;
    brushSize: number;
    imageWidth: number;
    imageHeight: number;
    naturalWidth: number;
    naturalHeight: number;
    sourcePreview?: { x: number; y: number } | null;
    className?: string;
}

export const RetouchInteractionOverlay: React.FC<RetouchInteractionOverlayProps> = ({
    step,
    target,
    brushSize,
    imageWidth,
    imageHeight,
    naturalWidth,
    naturalHeight,
    sourcePreview,
    className = ''
}) => {
    const scale = useMemo(() => ({
        x: imageWidth / naturalWidth,
        y: imageHeight / naturalHeight
    }), [imageWidth, imageHeight, naturalWidth, naturalHeight]);

    if (step === 'idle' && !target) return null;

    return (
        <div className={`absolute inset-0 pointer-events-none ${className}`}>
            <svg
                width={imageWidth}
                height={imageHeight}
                className="overflow-visible"
            >
                {/* Target Marker (The spot to fix) */}
                {target && (
                    <g>
                        <circle
                            cx={target.x * scale.x}
                            cy={target.y * scale.y}
                            r={brushSize * Math.min(scale.x, scale.y)}
                            fill="rgba(255, 255, 255, 0.2)"
                            stroke="rgba(255, 255, 255, 0.8)"
                            strokeWidth="1.5"
                            strokeDasharray="4 2"
                        />
                        <circle
                            cx={target.x * scale.x}
                            cy={target.y * scale.y}
                            r={brushSize * Math.min(scale.x, scale.y) + 1}
                            fill="none"
                            stroke="rgba(0, 0, 0, 0.4)"
                            strokeWidth="1"
                        />
                    </g>
                )}

                {/* Source Preview Marker & Connecting Line */}
                {step === 'source' && target && sourcePreview && (
                    <g>
                        <line
                            x1={target.x * scale.x}
                            y1={target.y * scale.y}
                            x2={sourcePreview.x * scale.x}
                            y2={sourcePreview.y * scale.y}
                            stroke="white"
                            strokeWidth="1.5"
                            strokeDasharray="5 5"
                        />
                        <circle
                            cx={sourcePreview.x * scale.x}
                            cy={sourcePreview.y * scale.y}
                            r={brushSize * Math.min(scale.x, scale.y)}
                            fill="rgba(255, 255, 255, 0.3)"
                            stroke="rgba(255, 255, 255, 0.9)"
                            strokeWidth="2"
                        />
                        <circle
                            cx={sourcePreview.x * scale.x}
                            cy={sourcePreview.y * scale.y}
                            r={brushSize * Math.min(scale.x, scale.y) + 1}
                            fill="none"
                            stroke="rgba(0, 0, 0, 0.5)"
                            strokeWidth="1"
                        />
                    </g>
                )}

                {/* Instructions Text */}
                <text
                    x="20"
                    y="40"
                    fill="white"
                    fontSize="14"
                    className="select-none font-medium drop-shadow-lg"
                    style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' } as React.CSSProperties}
                >
                    {step === 'target' ? 'Click on the spot to remove' : 'Click on a healthy area to sample from'}
                </text>
            </svg>
        </div>
    );
};
