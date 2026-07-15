import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Photo as SharedPhoto } from '@clickflash/ui';
import type { Photo, ManualEdits } from '@clickflash/types';
import { GripVertical } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BeforeAfterSliderProps {
  photo: Photo;
  beforeEdits?: ManualEdits | null;
  afterEdits?: ManualEdits | null;
  className?: string;
  zoom?: number;
  pan?: { x: number; y: number };
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  photo,
  beforeEdits,
  afterEdits,
  className,
  zoom = 1,
  pan = { x: 0, y: 0 },
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percent = (x / rect.width) * 100;
      setSliderPosition(percent);
    },
    []
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      handleMove(e.clientX);
    },
    [handleMove]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (isDragging) {
        handleMove(e.clientX);
      }
    },
    [isDragging, handleMove]
  );

  const onPointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    } else {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isDragging, onPointerMove, onPointerUp]);

  const extraTransform = `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`;

  return (
    <div
      ref={containerRef}
      className={twMerge(
        clsx(
          'relative w-full h-full overflow-hidden select-none',
          isDragging && 'cursor-ew-resize',
          className
        )
      )}
      onPointerDown={onPointerDown}
      style={{ touchAction: 'none' }}
    >
      {/* Background/Before Image */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <SharedPhoto
          photo={photo}
          manualEdits={beforeEdits || undefined}
          showWatermark={false}
          extraTransform={extraTransform}
        />
        <div className="absolute top-6 left-6 px-3 py-1.5 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-lg shadow-lg text-[10px] font-black uppercase text-slate-200 tracking-widest pointer-events-none transition-opacity">
          Original
        </div>
      </div>

      {/* Foreground/After Image (clipped) */}
      <div
        className={twMerge(
          "absolute inset-0 w-full h-full pointer-events-none border-r border-white/30 drop-shadow-[2px_0_10px_rgba(0,0,0,0.5)]",
          !isDragging && "transition-[clip-path] duration-300 ease-out"
        )}
        style={{
          clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
        }}
      >
        <SharedPhoto
          photo={photo}
          manualEdits={afterEdits || undefined}
          showWatermark={false}
          extraTransform={extraTransform}
        />
        <div className="absolute top-6 right-6 px-3 py-1.5 bg-blue-600/80 backdrop-blur-md border border-blue-400/20 rounded-lg shadow-lg shadow-blue-900/20 text-[10px] font-black uppercase text-white tracking-widest pointer-events-none transition-opacity">
          Auto Enhanced
        </div>
      </div>

      {/* Slider Handle */}
      <div
        className={twMerge(
          "absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_20px_rgba(0,0,0,0.8)] z-20 pointer-events-none group-hover:bg-blue-400 flex items-center justify-center",
          !isDragging && "transition-[left] duration-300 ease-out"
        )}
        style={{ left: `calc(${sliderPosition}% - 2px)` }}
      >
        <div 
          className={twMerge(
            "absolute w-10 h-10 bg-white text-slate-800 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)] border-2 border-slate-200 transition-transform duration-200",
            isDragging ? "scale-90 bg-slate-100" : "scale-100 group-hover:scale-110"
          )}
        >
          <GripVertical className="w-5 h-5 opacity-70" />
        </div>
      </div>
    </div>
  );
};
