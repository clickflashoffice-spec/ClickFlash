import { useState } from 'react';
import { X, ExternalLink, RefreshCw, Sparkles, Smartphone, Monitor } from 'lucide-react';

interface Gallery {
  id: string;
  coverUrl: string;
  title: string;
  status: string;
  customerEmail?: string;
  customerPhone?: string;
  totalPhotos: number;
  aiStatus?: string;
}

interface LiveGalleryPreviewModalProps {
  gallery: Gallery | null;
  isOpen: boolean;
  onClose: () => void;
  onTriggerUpsell: (galleryId: string) => Promise<void>;
}

export function LiveGalleryPreviewModal({ gallery, isOpen, onClose, onTriggerUpsell }: LiveGalleryPreviewModalProps) {
  const [deviceView, setDeviceView] = useState<'mobile' | 'desktop'>('mobile');
  const [isTriggering, setIsTriggering] = useState(false);

  if (!isOpen || !gallery) return null;

  // Assume the gallery portal runs on port 5176
  const galleryPreviewUrl = `http://localhost:5176/album/${gallery.id}`;

  const handleUpsell = async () => {
    setIsTriggering(true);
    await onTriggerUpsell(gallery.id);
    setIsTriggering(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Gallery Preview: {gallery.title}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              {gallery.totalPhotos} photos • {gallery.customerEmail || 'No email'} • {gallery.customerPhone || 'No phone'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {gallery.aiStatus === 'Hot Lead' && (
              <button 
                onClick={handleUpsell}
                disabled={isTriggering}
                className="bg-fuchsia-600 hover:bg-fuchsia-500 disabled:bg-fuchsia-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-fuchsia-900/20"
              >
                {isTriggering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Trigger AI Upsell
              </button>
            )}
            
            <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
              <button 
                onClick={() => setDeviceView('mobile')}
                className={`p-1.5 rounded-md transition-colors ${deviceView === 'mobile' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Mobile View"
              >
                <Smartphone className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setDeviceView('desktop')}
                className={`p-1.5 rounded-md transition-colors ${deviceView === 'desktop' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Desktop View"
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>

            <a 
              href={galleryPreviewUrl} 
              target="_blank" 
              rel="noreferrer"
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
              title="Open in new tab"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
            
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-slate-950 p-6 flex justify-center items-center overflow-hidden">
          <div className={`relative transition-all duration-500 ease-in-out border border-slate-700 shadow-2xl bg-black ${
            deviceView === 'mobile' 
              ? 'w-[375px] h-[812px] rounded-[3rem] border-[8px] border-slate-800' 
              : 'w-full h-full rounded-xl'
          }`}>
            {deviceView === 'mobile' && (
              <>
                <div className="absolute top-0 inset-x-0 h-6 bg-slate-800 rounded-t-[2.5rem] z-10 flex justify-center items-center">
                   <div className="w-16 h-4 bg-black rounded-full mt-2"></div>
                </div>
              </>
            )}
            
            <iframe 
              src={galleryPreviewUrl}
              className={`w-full h-full bg-slate-900 ${deviceView === 'mobile' ? 'rounded-[2.5rem] pt-6' : 'rounded-lg'}`}
              title={`Gallery Preview - ${gallery.title}`}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          </div>
        </div>
        
      </div>
    </div>
  );
}
