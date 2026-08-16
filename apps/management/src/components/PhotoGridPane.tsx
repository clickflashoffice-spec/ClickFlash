import { Sparkles, Download, Flag, MoreVertical, MousePointerClick } from 'lucide-react';
import type { Gallery } from '../views/GalleriesOversightView';

export function PhotoGridPane({ gallery }: { gallery: Gallery | null }) {
  if (!gallery) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <MousePointerClick className="w-12 h-12 text-slate-700 mx-auto mb-3" />
        <h3 className="text-base font-medium text-slate-400">Select a gallery to preview</h3>
        <p className="text-sm text-slate-600 mt-1 max-w-sm">Click any gallery on the left to view its photos and actions.</p>
      </div>
    );
  }

  // Placeholder photos for the grid view
  const photos = Array.from({ length: 12 }).map((_, i) => ({
    id: `photo-${i}`,
    url: gallery.coverUrl,
    filename: `IMG_${8000 + i}.jpg`,
    resolution: '24'
  }));

  return (
    <div className="flex flex-col h-full">
      {/* Detail Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10 flex flex-col shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              {gallery.title}
              <span className="text-xs font-semibold px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {gallery.status}
              </span>
            </h2>
            <div className="text-sm text-slate-400 mt-2 flex items-center gap-2">
              <span>📷 {gallery.photographer}</span>
              <span>·</span>
              <span>📧 {gallery.customerEmail || 'No email'}</span>
              <span>·</span>
              <span>📱 {gallery.customerPhone || 'No phone'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Grid */}
      <div className="flex-1 overflow-y-auto p-6 relative">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {photos.map(photo => (
            <div key={photo.id} className="relative aspect-[3/2] rounded-lg overflow-hidden group cursor-pointer border border-slate-800">
              <img 
                src={photo.url} 
                alt={photo.filename} 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                <span className="text-xs text-white font-medium truncate">{photo.filename}</span>
                <span className="text-[10px] text-white/70">{photo.resolution}MP</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Bar */}
      <div className="border-t border-slate-800 bg-slate-900/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between gap-4 shrink-0">
        <div className="text-sm text-slate-500 italic">
          Select photos to batch-action
        </div>
        <div className="flex items-center gap-3">
          <button 
            disabled={gallery.aiStatus !== 'Hot Lead'} 
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500"
          >
            <Sparkles className="w-4 h-4" /> AI Upsell
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white border border-slate-700 bg-slate-800 hover:bg-slate-700 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-400 border border-red-900/30 bg-red-950/20 hover:bg-red-900/40 transition-colors">
            <Flag className="w-4 h-4" /> Flag for Review
          </button>
          <button className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
