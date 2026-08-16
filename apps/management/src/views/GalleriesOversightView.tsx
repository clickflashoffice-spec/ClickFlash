import { useState, useEffect } from 'react';
import { fetchAlbums } from '../lib/api';
import { GalleryListPane } from '../components/GalleryListPane';
import { PhotoGridPane } from '../components/PhotoGridPane';
import { RefreshCw } from 'lucide-react';

export type GalleryStatus = 'Preview' | 'Partial' | 'Anchor' | 'Sold' | 'Expired';

export interface Gallery {
  id: string;
  coverUrl: string;
  status: GalleryStatus;
  date: string;
  title: string;
  photographer: string;
  totalPhotos: number;
  boughtPhotos: number;
  customerEmail?: string;
  customerPhone?: string;
  downloadedAt?: string;
  aiStatus?: 'Hot Lead' | 'Discount Sent' | 'Upsold';
}

export function GalleriesOversightView() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const albums = await fetchAlbums();
      const mappedGalleries: Gallery[] = albums.map(album => ({
        id: album.id,
        coverUrl: album.coverPhotoUrl || 'https://images.unsplash.com/photo-1544462208-d8f99e4695e2?auto=format&fit=crop&q=80&w=400&h=300',
        status: (album.status as GalleryStatus) || 'Partial',
        date: album.date || new Date().toLocaleDateString(),
        title: album.title || `Room ${album.roomNumber || 'Unknown'}`,
        photographer: `Photographer ${album.photographerId}`,
        totalPhotos: album.numberOfPhotos || (album.photos ? album.photos.length : 0),
        boughtPhotos: 0,
        customerEmail: album.customerEmail,
        customerPhone: (album as any).customerPhone,
        aiStatus: album.numberOfPhotos && album.numberOfPhotos > 20 && !album.customerEmail ? 'Hot Lead' : undefined
      }));
      setGalleries(mappedGalleries);
    } catch (error) {
      console.error('Failed to load albums', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalGalleries = galleries.length;
  const openedGalleries = galleries.filter(g => g.downloadedAt || g.status === 'Anchor' || g.status === 'Sold').length;
  const openedPercent = totalGalleries ? Math.round((openedGalleries / totalGalleries) * 100) : 0;
  
  const soldGalleries = galleries.filter(g => g.status === 'Sold').length;
  const soldPercent = totalGalleries ? Math.round((soldGalleries / totalGalleries) * 100) : 0;
  
  const aiLeads = galleries.filter(g => g.aiStatus === 'Hot Lead').length;
  
  const selectedGallery = galleries.find(g => g.id === selectedGalleryId) || null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-8">
      {/* Header Bar */}
      <div className="px-8 py-6 border-b border-slate-800 bg-slate-950 flex-none shrink-0">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <span role="img" aria-label="🖼️">🖼️</span> Customer Galleries Oversight
            </h1>
            <p className="text-base font-normal text-slate-400 mt-1">
              Monitor digital passes, AI upsells, and customer engagement.
            </p>
          </div>
          <div className="flex gap-4">
            <button onClick={loadData} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-slate-900 border border-slate-800 rounded-xl px-4 py-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>
        
        {/* KPI Strip */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3 min-w-fit">
            <div>
              <div className="text-3xl font-bold text-white">📊 {openedPercent}%</div>
              <div className="text-sm text-slate-400 mt-1">Opened</div>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3 min-w-fit">
            <div>
              <div className="text-3xl font-bold text-white">📈 {soldPercent}%</div>
              <div className="text-sm text-slate-400 mt-1">Sold</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-900/50 to-slate-900 border-indigo-500/30 border rounded-xl px-4 py-3 flex items-center gap-3 min-w-fit">
            <div>
              <div className="text-3xl font-bold text-white">✨ {aiLeads}</div>
              <div className="text-sm text-slate-400 mt-1">AI Leads</div>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3 min-w-fit">
            <div className="text-sm text-slate-400">
              <span className="text-white font-bold">{totalGalleries}</span> Total | <span className="text-emerald-400">{soldGalleries}</span> Paid | <span className="text-amber-400">{totalGalleries - soldGalleries}</span> Pending
            </div>
          </div>
        </div>
      </div>

      {/* Split View Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Master Pane */}
        <div className="w-[380px] min-w-[320px] max-w-[420px] bg-slate-950 border-r border-slate-800 flex flex-col">
          <GalleryListPane 
            galleries={galleries} 
            isLoading={isLoading} 
            selectedGalleryId={selectedGalleryId}
            onSelectGallery={setSelectedGalleryId} 
          />
        </div>
        
        {/* Detail Pane */}
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
          <PhotoGridPane gallery={selectedGallery} />
        </div>
      </div>
    </div>
  );
}
