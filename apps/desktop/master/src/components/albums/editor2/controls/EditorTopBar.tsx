import React from "react";
import { Photo } from "../../../../types";
import { Layers, Download, Loader2, X } from "lucide-react";
import { KeyboardShortcutsHelp } from "../KeyboardShortcutsHelp";

interface EditorTopBarProps {
  photo: Photo;
  zoom: number;
  showBeforeAfter: boolean;
  setShowBeforeAfter: (val: boolean | ((prev: boolean) => boolean)) => void;
  handleDownload: () => void;
  isExporting: boolean;
  onClose: () => void;
}

export const EditorTopBar: React.FC<EditorTopBarProps> = ({
  photo,
  zoom,
  showBeforeAfter,
  setShowBeforeAfter,
  handleDownload,
  isExporting,
  onClose,
}) => {
  return (
    <div className="flex items-center justify-between px-6 h-16 bg-slate-900 border-b border-white/5 z-50">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-blue-500">
            <Layers className="h-5 w-5" />
          </span>
          <h2 className="text-sm font-black tracking-widest text-white uppercase flex items-center gap-2">
            <span className="text-slate-500">Orders</span>
            <span className="text-slate-700">/</span>
            <span>Photo Editor</span>
          </h2>
        </div>

        <div className="h-6 w-px bg-white/10"></div>

        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-300 truncate max-w-[200px]">
            {photo.title || "Untitled Image"}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {zoom > 1 ? `${Math.round(zoom * 100)}%` : "FIT TO SCREEN"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setShowBeforeAfter(false)}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              !showBeforeAfter
                ? "bg-blue-600 text-white shadow-lg"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => setShowBeforeAfter(true)}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              showBeforeAfter
                ? "bg-blue-600 text-white shadow-lg"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Compare
          </button>
        </div>

        <div className="h-6 w-px bg-white/10 mx-1"></div>

        <button
          onClick={handleDownload}
          disabled={isExporting}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-all border border-white/5 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
          title="Download Edited Image"
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          Download
        </button>

        <KeyboardShortcutsHelp />

        <div className="h-6 w-px bg-white/10 mx-1"></div>

        <button
          onClick={onClose}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all border border-white/5 hover:border-red-500/30"
          title="Close (Esc)"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
