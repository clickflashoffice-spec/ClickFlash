import React from "react";
import styles from "../../../PhotoEditModal.module.css";

interface BeforeAfterViewerProps {
  previewUrl: string;
  originalPhotoStyle: React.CSSProperties;
  photoStyle: React.CSSProperties;
}

export const BeforeAfterViewer: React.FC<BeforeAfterViewerProps> = ({
  previewUrl,
  originalPhotoStyle,
  photoStyle,
}) => {
  return (
    <div className="flex w-full h-full gap-2 p-6 pointer-events-none">
      {/* Before Panel */}
      <div className="flex-1 relative bg-slate-900/40 rounded-3xl border border-white/5 flex items-center justify-center overflow-hidden">
        <div className="absolute top-6 left-6 z-10 bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border border-white/5">
          Original
        </div>
        <img
          src={previewUrl}
          alt="Before"
          className={`${styles.photoPreview} ${styles.beforeAfterPanel} opacity-80`}
          style={
            {
              "--filter": originalPhotoStyle.filter,
              "--transform": originalPhotoStyle.transform,
            } as React.CSSProperties
          }
          draggable={false}
        />
      </div>
      {/* After Panel */}
      <div className="flex-1 relative bg-slate-900/20 rounded-3xl border border-blue-500/20 flex items-center justify-center overflow-hidden">
        <div className="absolute top-6 left-6 z-10 bg-blue-600/80 backdrop-blur px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] text-white">
          Edited
        </div>
        <img
          src={previewUrl}
          alt="After"
          className={`${styles.photoPreview} ${styles.beforeAfterPanel}`}
          style={
            {
              "--filter": photoStyle.filter,
              "--transform": photoStyle.transform,
            } as React.CSSProperties
          }
          draggable={false}
        />
      </div>
    </div>
  );
};
