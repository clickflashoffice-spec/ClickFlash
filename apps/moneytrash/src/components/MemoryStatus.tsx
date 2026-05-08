'use client';

import { HardDrive } from 'lucide-react';

interface MemoryStatusProps {
  memoryPressure: number;
  previewCount: number;
}

export function MemoryStatus({ memoryPressure, previewCount }: MemoryStatusProps) {
  const getStatusColor = () => {
    if (memoryPressure > 0.8) return 'text-red-500';
    if (memoryPressure > 0.6) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusText = () => {
    if (memoryPressure > 0.8) return 'HIGH';
    if (memoryPressure > 0.6) return 'MODERATE';
    return 'NORMAL';
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg text-xs">
      <HardDrive className={`w-4 h-4 ${getStatusColor()}`} />
      <span className="text-slate-400">VRAM:</span>
      <span className={getStatusColor()}>{getStatusText()}</span>
      <span className="text-slate-500">|</span>
      <span className="text-slate-400">Previews: {previewCount}</span>
    </div>
  );
}
