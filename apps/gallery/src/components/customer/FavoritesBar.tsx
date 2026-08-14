import React, { useState } from 'react';
import { Heart, Download, Smartphone, Mail, Link as LinkIcon, X, Check } from 'lucide-react';

interface FavoritesBarProps {
  favorites: string[];
  totalPhotos: number;
  galleryId: string;
  onShare: (platform: string) => void;
  onDownloadFavorites: () => void;
  onClearFavorites: () => void;
}

export default function FavoritesBar({
  favorites,
  totalPhotos,
  galleryId,
  onShare,
  onDownloadFavorites,
  onClearFavorites
}: FavoritesBarProps) {
  const [copied, setCopied] = useState(false);
  const isVisible = favorites.length > 0;

  const handleCopyLink = () => {
    onShare('clipboard');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isVisible) {
    return (
      <div className="w-full bg-slate-900/50 backdrop-blur-md border-b border-slate-800 p-3 text-center transition-all duration-300">
        <p className="text-slate-400 text-sm flex items-center justify-center gap-2">
          <Heart className="w-4 h-4 text-slate-500" />
          Tap ♥ on photos to add favorites
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900 border-b border-cyan-900/30 shadow-lg shadow-cyan-900/10 transition-all duration-500 transform translate-y-0">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Selection Count */}
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500/20 p-2 rounded-full">
            <Heart className="w-5 h-5 text-cyan-400 fill-cyan-400" />
          </div>
          <div>
            <h3 className="text-slate-200 font-medium">Favorites Selected</h3>
            <p className="text-cyan-400 text-sm font-semibold">
              {favorites.length} <span className="text-slate-500 font-normal">of {totalPhotos} photos</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={onDownloadFavorites}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Selected
          </button>

          <button
            onClick={() => onShare('whatsapp')}
            className="flex items-center gap-2 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-xl text-sm font-medium transition-colors"
            title="Share via WhatsApp"
          >
            <Smartphone className="w-4 h-4" />
          </button>

          <button
            onClick={() => onShare('email')}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl text-sm font-medium transition-colors"
            title="Share via Email"
          >
            <Mail className="w-4 h-4" />
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
            title="Copy Gallery Link"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <LinkIcon className="w-4 h-4" />}
          </button>

          <div className="w-px h-6 bg-slate-800 mx-1"></div>

          <button
            onClick={onClearFavorites}
            className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-medium transition-colors"
            title="Clear Selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
