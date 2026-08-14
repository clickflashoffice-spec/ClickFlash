import React, { memo } from 'react';
import { History, FileCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { UploadHistoryItem } from '@/types';

interface Props {
  uploadHistory: UploadHistoryItem[];
}

export const HistoryModal: React.FC<Props> = memo(({ uploadHistory }) => {
  if (uploadHistory.length === 0) return null;

  return (
    <div className="max-w-6xl mx-auto mb-6 bg-[#131C31]/50 border border-white/10 rounded-2xl p-6">
      <h3 className="text-lg font-semibold mb-4 text-white/90 flex items-center gap-2">
        <History className="w-5 h-5" />
        Recent Uploads
      </h3>
      <div className="space-y-2">
        {uploadHistory.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-[#131C31] rounded-lg">
            <div className="flex items-center gap-3">
              <FileCheck className={clsx(
                "w-4 h-4",
                item.mode === 'moneytrash' ? 'text-[#06B6D4]' : 'text-[#8B5CF6]'
              )} />
              <div>
                <p className="text-sm font-medium text-white">{item.eventName}</p>
                <p className="text-xs text-white/60">{item.accessCode} • {item.fileCount} files</p>
              </div>
            </div>
            <span className="text-xs text-white/60">
              {new Date(item.timestamp).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

HistoryModal.displayName = 'HistoryModal';
