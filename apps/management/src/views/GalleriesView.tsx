import { useState, useEffect } from 'react';
import { 
  Images, 
  Search, 
  TrendingUp, 
  Eye, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MoreVertical,
  Download,
  Phone,
  Mail,
  Camera,
  RefreshCw
} from 'lucide-react';
import { fetchAlbums, triggerAIUpsell } from '../lib/api';
import { LiveGalleryPreviewModal } from '../components/LiveGalleryPreviewModal';

type GalleryStatus = 'Preview' | 'Partial' | 'Anchor' | 'Sold' | 'Expired';

interface Gallery {
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

export function GalleriesView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [triggeringUpsell, setTriggeringUpsell] = useState<string | null>(null);
  const [previewGallery, setPreviewGallery] = useState<Gallery | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const albums = await fetchAlbums();
    
    const mappedGalleries: Gallery[] = albums.map(album => ({
      id: album.id,
      coverUrl: album.coverPhotoUrl || 'https://images.unsplash.com/photo-1544462208-d8f99e4695e2?auto=format&fit=crop&q=80&w=400&h=300',
      status: (album.status as GalleryStatus) || 'Partial',
      date: album.date || new Date().toLocaleDateString(),
      title: album.title || `Room ${album.roomNumber || 'Unknown'}`,
      photographer: `Photographer ${album.photographerId}`,
      totalPhotos: album.numberOfPhotos || (album.photos ? album.photos.length : 0),
      boughtPhotos: 0, // Would be calculated based on orders linked to this album
      customerEmail: album.customerEmail,
      customerPhone: (album as any).customerPhone,
      aiStatus: album.numberOfPhotos && album.numberOfPhotos > 20 && !album.customerEmail ? 'Hot Lead' : undefined
    }));

    setGalleries(mappedGalleries);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpsell = async (galleryId: string) => {
    setTriggeringUpsell(galleryId);
    await triggerAIUpsell(galleryId, 'album');
    setTriggeringUpsell(null);
    alert('AI Upsell sequence triggered via WhatsApp!');
  };

  const filteredGalleries = galleries.filter(g => 
    g.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.photographer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.customerEmail && g.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Images className="w-8 h-8 text-indigo-500" />
            Customer Galleries
          </h2>
          <p className="text-slate-400 mt-1">Monitor digital passes, AI upsells, and customer engagement.</p>
        </div>
        <button 
          onClick={loadData} 
          disabled={isLoading}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Bento Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Opened Rate */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Eye className="w-16 h-16 text-emerald-500" />
          </div>
          <div className="flex justify-between items-start mb-4">
            <div className="text-emerald-400 bg-emerald-500/10 p-2 rounded-lg">
              <Eye className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
              Push Delivery
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">57%</span>
          </div>
          <p className="text-sm text-slate-400 mt-1">Opened by guest</p>
          <p className="text-xs text-slate-500 mt-2">36 of {galleries.length} galleries (last 30 days)</p>
        </div>

        {/* Sold Rate */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-16 h-16 text-fuchsia-500" />
          </div>
          <div className="flex justify-between items-start mb-4">
            <div className="text-fuchsia-400 bg-fuchsia-500/10 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold bg-fuchsia-500/10 text-fuchsia-400 px-2.5 py-1 rounded-full border border-fuchsia-500/20">
              Selling Well
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">38%</span>
          </div>
          <p className="text-sm text-slate-400 mt-1">Converted</p>
          <p className="text-xs text-slate-500 mt-2">24 of {galleries.length} galleries (last 30 days)</p>
        </div>

        {/* AI Sales Hunter */}
        <div className="bg-gradient-to-br from-indigo-900/50 to-slate-900 rounded-xl border border-indigo-500/30 p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Sparkles className="w-16 h-16 text-indigo-400" />
          </div>
          <div className="flex justify-between items-start mb-4">
            <div className="text-indigo-400 bg-indigo-500/20 p-2 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{galleries.filter(g => g.aiStatus === 'Hot Lead').length}</span>
          </div>
          <p className="text-sm text-slate-300 mt-1">Pending AI Upsells</p>
          <p className="text-xs text-indigo-300/70 mt-2">WhatsApp Hunter Active</p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col justify-center items-center">
            <span className="text-2xl font-bold text-white">{galleries.length}</span>
            <span className="text-xs text-slate-400 mt-1 text-center">Total Galleries</span>
          </div>
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col justify-center items-center">
            <span className="text-2xl font-bold text-white">{galleries.filter(g => g.status === 'Sold').length}</span>
            <span className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Paid</span>
          </div>
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col justify-center items-center">
            <span className="text-2xl font-bold text-white">{galleries.filter(g => g.status === 'Partial').length}</span>
            <span className="text-xs text-amber-400 mt-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Pending</span>
          </div>
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col justify-center items-center">
            <span className="text-2xl font-bold text-white">{galleries.filter(g => g.status === 'Expired').length}</span>
            <span className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Expired</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search by client, photographer, room..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
          />
        </div>
        <select className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm appearance-none min-w-[160px]">
          <option>All statuses</option>
          <option>Preview</option>
          <option>Partial</option>
          <option>Sold</option>
        </select>
      </div>

      {/* Gallery Grid */}
      <div className="min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
            <p>Loading live galleries...</p>
          </div>
        ) : filteredGalleries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-slate-500">
            <p>No galleries found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredGalleries.map((gallery) => (
              <div key={gallery.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all shadow-sm group flex flex-col">
                
                {/* Image Header */}
                <div 
                  className="relative h-48 w-full bg-slate-800 overflow-hidden shrink-0 cursor-pointer"
                  onClick={() => setPreviewGallery(gallery)}
                >
                  <img 
                    src={gallery.coverUrl} 
                    alt="Cover" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
                  
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2 pr-16">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg shadow-sm backdrop-blur-md border whitespace-nowrap
                      ${gallery.status === 'Preview' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 
                        gallery.status === 'Partial' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 
                        'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}
                    >
                      {gallery.status}
                    </span>
                    
                    {gallery.aiStatus && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg shadow-sm backdrop-blur-md border bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30 flex items-center gap-1 whitespace-nowrap">
                        <Sparkles className="w-3 h-3" />
                        {gallery.aiStatus}
                      </span>
                    )}
                  </div>
                  
                  <div className="absolute top-3 right-3">
                    <span className="text-xs font-medium text-slate-300 bg-slate-900/60 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-700/50 shadow-sm whitespace-nowrap">
                      {gallery.date}
                    </span>
                  </div>
                </div>

                {/* Content Body */}
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0 pr-4">
                      <h3 className="text-lg font-bold text-white truncate">{gallery.title}</h3>
                      <div className="flex items-center gap-1.5 text-slate-400 text-sm mt-0.5">
                        <Camera className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">By {gallery.photographer}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm text-slate-300">
                        <span className="font-semibold text-white">{gallery.boughtPhotos}</span> / {gallery.totalPhotos}
                      </div>
                      <div className="text-xs text-slate-500">Photos Bought</div>
                    </div>
                  </div>

                  {/* Customer Info (if available) */}
                  <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50 space-y-2 mb-4 mt-auto">
                    {gallery.customerEmail ? (
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{gallery.customerEmail}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic px-1">No email collected</div>
                    )}
                    
                    {gallery.customerPhone && (
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{gallery.customerPhone}</span>
                      </div>
                    )}

                    {gallery.downloadedAt ? (
                      <div className="flex items-center gap-2 text-xs text-emerald-400/80 mt-1 pt-2 border-t border-slate-800">
                        <Download className="w-3.5 h-3.5 shrink-0" />
                        <span>Downloaded: {gallery.downloadedAt}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 pt-2 border-t border-slate-800">
                        <Download className="w-3.5 h-3.5 shrink-0" />
                        <span>Not downloaded yet</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/50">
                    <button 
                      onClick={() => setPreviewGallery(gallery)}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 px-4 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <Eye className="w-4 h-4 shrink-0" />
                      Live Preview
                    </button>
                    
                    {gallery.aiStatus === 'Hot Lead' && (
                      <button 
                        onClick={() => handleUpsell(gallery.id)}
                        disabled={triggeringUpsell === gallery.id}
                        className="bg-fuchsia-600 hover:bg-fuchsia-500 disabled:bg-fuchsia-800 text-white p-2 rounded-xl transition-colors shadow-sm shrink-0" 
                        title="Trigger AI WhatsApp Upsell"
                      >
                        {triggeringUpsell === gallery.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors border border-slate-800 shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
              </div>
            ))}
          </div>
        )}
      </div>

      <LiveGalleryPreviewModal 
        gallery={previewGallery}
        isOpen={!!previewGallery}
        onClose={() => setPreviewGallery(null)}
        onTriggerUpsell={async (id) => await handleUpsell(id)}
      />
    </div>
  );
}
