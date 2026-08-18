import React from 'react';
import { motion } from 'framer-motion';
import { Photo } from '../../../types';

interface PhotoViewerProps {
    viewerRef: React.RefObject<HTMLDivElement | null>;
    activePhoto: Photo | null;
    isCropping: boolean;
    isRetouching: boolean;
    isPanning: boolean;
    mouseCoords: { x: number, y: number };
    retouchStep: string;
    retouchTarget: any;
    brushSize: number;
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseMove: (e: React.MouseEvent<HTMLElement>) => void;
    onMouseUp: () => void;
    children?: React.ReactNode;
}

const PhotoViewer: React.FC<PhotoViewerProps> = ({
    viewerRef,
    activePhoto,
    isCropping,
    isRetouching,
    isPanning,
    mouseCoords,
    retouchStep,
    retouchTarget,
    brushSize,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    children
}) => {
    return (
        <div
            ref={viewerRef}
            className={`flex-1 relative flex items-center justify-center min-w-0 min-h-0 p-4 lg:p-8 transition-all duration-500 overflow-hidden bg-slate-950
                ${isCropping ? 'cursor-crosshair' : (isRetouching ? 'cursor-none' : (isPanning ? 'cursor-grabbing' : 'cursor-grab'))}`}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
        >
            {activePhoto ? (
                <motion.div
                    key={activePhoto.id}
                    className="w-full h-full flex items-center justify-center relative"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {children}

                    {isRetouching && (
                        <>
                            <motion.div
                                className="brush-cursor"
                                style={{
                                    '--mouse-x': `${mouseCoords.x}px`,
                                    '--mouse-y': `${mouseCoords.y}px`,
                                    '--brush-diameter': `${brushSize * 2}px`,
                                    '--cursor-border-style': retouchStep === 'source' ? 'dashed' : 'solid'
                                } as any}
                            >
                                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap backdrop-blur-sm">
                                    {retouchStep === 'source' ? 'Click Source' : 'Click Target'}
                                </span>
                            </motion.div>
                            {retouchTarget && (
                                <motion.div
                                    className="retouch-target-marker"
                                    style={{
                                        '--target-x': `${retouchTarget.x}px`,
                                        '--target-y': `${retouchTarget.y}px`,
                                        '--brush-diameter': `${brushSize * 2}px`,
                                    } as any}
                                />
                            )}
                        </>
                    )}
                </motion.div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full w-full">
                    <p className="text-red-500 font-bold text-4xl mb-4">NO PHOTO SELECTED</p>
                </div>
            )}
        </div>
    );
};

export default PhotoViewer;
