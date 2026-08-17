import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles } from 'lucide-react';
import { evaluateClientPhotoQuality } from '../services/wasmClientScorer';
import { usePhotographerStore, UploadBatchItem } from '../stores/photographerStore';

export const DropzoneArea: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const addFilesToBatch = usePhotographerStore((state) => state.addFilesToBatch);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsProcessing(true);

    const files = Array.from(fileList);
    const newItems: UploadBatchItem[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/') && !file.name.match(/\.(cr2|cr3|nef|arw|dng|raw)$/i)) {
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      // Run browser WASM / Canvas evaluation
      const quality = await evaluateClientPhotoQuality(file);

      newItems.push({
        id: crypto.randomUUID(),
        file,
        previewUrl,
        fileName: file.name,
        fileSize: file.size,
        sharpnessScore: quality.sharpnessScore,
        isKeeper: quality.isKeeper,
        status: 'pending',
        progress: 0,
      });
    }

    addFilesToBatch(newItems);
    setIsProcessing(false);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => fileInputRef.current?.click()}
      className={`relative p-8 rounded-3xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-3 ${
        isDragging
          ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/40'
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFiles(e.target.files)}
        multiple
        accept="image/*,.cr2,.cr3,.nef,.arw,.dng,.raw"
        className="hidden"
      />

      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/5">
        <UploadCloud size={32} />
      </div>

      <div>
        <h3 className="text-base font-bold text-white flex items-center justify-center gap-2">
          {isProcessing ? 'Evaluating AI Sharpness with WASM...' : 'Drop High-Res Photos or RAWs Here'}
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md">
          Supports JPEG, PNG, Sony ARW, Canon CR2/CR3, Nikon NEF. Evaluates sharpness locally before uploading.
        </p>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <span className="text-[11px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700">
          ⚡ Direct-to-R2 (Gigabit line speed)
        </span>
        <span className="text-[11px] bg-indigo-500/10 text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-500/20 flex items-center gap-1">
          <Sparkles size={12} /> Auto-Blur Culling Active
        </span>
      </div>
    </div>
  );
};
