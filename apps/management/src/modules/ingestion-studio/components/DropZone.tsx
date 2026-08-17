import React, { useCallback, useState } from 'react';
import { UploadCloud, Folder, FileImage } from 'lucide-react';
import { useIngestionStore } from '../stores/ingestionStore';

export function DropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const { files, addFiles } = useIngestionStore();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(file => 
        /\.(jpg|jpeg|png|raw|cr2|nef|arw)$/i.test(file.name)
      );
      addFiles(droppedFiles);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  };

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      <div 
        className={`w-full p-10 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition-all duration-200 ${
          isDragging 
            ? 'border-indigo-500 bg-indigo-500/10' 
            : 'border-slate-700 bg-slate-900/50 hover:bg-slate-800/50 hover:border-slate-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="p-4 bg-slate-800 rounded-full mb-4">
          <UploadCloud className="w-8 h-8 text-indigo-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Drag & Drop Media Here</h3>
        <p className="text-slate-400 text-sm mb-6 text-center max-w-md">
          Supports JPG, PNG, RAW, CR2, NEF, ARW. Photos will be automatically graded and processed by the Master OS.
        </p>
        
        <div className="flex gap-4">
          <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors">
            <FileImage className="w-4 h-4 text-cyan-400" />
            Browse Files
            <input type="file" multiple className="hidden" accept=".jpg,.jpeg,.png,.raw,.cr2,.nef,.arw" onChange={handleFileInput} />
          </label>
          <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors">
            <Folder className="w-4 h-4 text-amber-400" />
            Browse Folder
            {/* @ts-ignore - webkitdirectory is non-standard but widely supported */}
            <input type="file" multiple webkitdirectory="" directory="" className="hidden" onChange={handleFileInput} />
          </label>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-4 flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <FileImage className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-white font-semibold">{files.length} files selected</p>
              <p className="text-xs text-slate-400">Total size: {formatSize(totalSize)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
