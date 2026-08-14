'use client';

import { HardDrive } from 'lucide-react';

interface MemoryStatusProps {
  memoryPressure: number;
  previewCount: number;
}

export function MemoryStatus({ memoryPressure, previewCount }: MemoryStatusProps) {
  const getStatusColor = () => {
    if (memoryPressure > 0.8) return 'text-red-500';
    if (memoryPressure > 0.6) return 'text-[#06B6D4]';
    return 'text-[#8B5CF6]';
  };

  const getStatusText = () => {
    if (memoryPressure > 0.8) return 'HIGH';
    if (memoryPressure > 0.6) return 'MODERATE';
    return 'NORMAL';
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#131C31] rounded-lg text-xs">
      <HardDrive className={`w-4 h-4 ${getStatusColor()}`} />
      <span className="text-white/60">VRAM:</span>
      <span className={getStatusColor()}>{getStatusText()}</span>
      <span className="text-white/50">|</span>
      <span className="text-white/60">Previews: {previewCount}</span>
    </div>
  );
}
