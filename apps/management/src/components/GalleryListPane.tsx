import { Search } from 'lucide-react';
import type { Gallery } from '../views/GalleriesOversightView';

export function GalleryListPane({ 
  galleries, 
  isLoading, 
  selectedGalleryId, 
  onSelectGallery 
}: { 
  galleries: Gallery[]; 
  isLoading: boolean;
  selectedGalleryId: string | null;
  onSelectGallery: (id: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-800 sticky top-0 bg-slate-950 z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search galleries..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2 mt-3">
          <select className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none">
            <option>All</option>
            <option>Preview</option>
            <option>Partial</option>
            <option>Sold</option>
          </select>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          <div className="text-slate-500 text-sm p-4">Loading galleries...</div>
        ) : galleries.length === 0 ? (
          <div className="text-slate-500 text-sm p-4 text-center">No galleries found.</div>
        ) : (
          galleries.map(g => (
            <div 
              key={g.id}
              onClick={() => onSelectGallery(g.id)}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                selectedGalleryId === g.id 
                  ? 'bg-slate-800 border-indigo-500/60 shadow-lg shadow-indigo-500/10 border-l-2 border-l-indigo-500' 
                  : 'bg-slate-900 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
              }`}
            >
              <img src={g.coverUrl} alt="Cover" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div className="text-sm font-semibold text-white truncate">{g.title}</div>
                  {g.aiStatus === 'Hot Lead' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 px-1.5 py-0.5 rounded ml-2 flex-shrink-0">
                      Hot Lead
                    </span>
                  )}
                </div>
                <div className="text-xs font-normal text-slate-400 mt-0.5">{g.photographer}</div>
                <div className="text-xs font-medium text-slate-300 mt-1">
                  <span className="text-white font-semibold">{g.boughtPhotos}</span>/{g.totalPhotos} photos
                </div>
                <div className="text-xs font-medium text-slate-500 mt-1 truncate">
                  {g.date} · {g.status}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
