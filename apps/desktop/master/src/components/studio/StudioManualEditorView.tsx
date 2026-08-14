import React, { useState } from 'react';
import FilerobotImageEditor, { TABS, TOOLS } from 'react-filerobot-image-editor';
import { Photo, Album } from '../../types';
import { apiService } from '../../services/apiService';
import { logger } from '../../utils/logger';
import { Loader2 } from 'lucide-react';

interface StudioManualEditorViewProps {
  photos: Photo[];
  album?: Album;
  onClose: () => void;
  showToast?: (message: string) => void;
}

export const StudioManualEditorView: React.FC<StudioManualEditorViewProps> = ({
  photos,
  onClose,
  showToast = (_msg: string) => {},
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const activePhoto = photos[currentIndex];

  if (!activePhoto) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-slate-900 text-slate-400">
        <p>No photo selected for editing.</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-800 rounded hover:bg-slate-700">
          Close
        </button>
      </div>
    );
  }

  const handleSave = async (editedImageObject: any) => {
    setIsSaving(true);
    try {
      // Filerobot provides base64 image data in editedImageObject.imageBase64
      const response = await fetch(editedImageObject.imageBase64);
      const blob = await response.blob();
      
      const file = new File([blob], `edited_${activePhoto.id}.jpg`, { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('url', file); // In PocketBase, replacing the file field (url) updates it
      
      // Also update manualEdits to indicate it was manually edited in the new system,
      // and toggle off autoEnhanced if we want to flag it as manually handled.
      formData.append('manualEdits', JSON.stringify({
         ...activePhoto.manualEdits,
         _filerobotEdited: true
      }));

      await apiService.updatePhoto(activePhoto.id, formData);
      showToast('Photo saved successfully!');
      
      // Move to next photo or close
      if (currentIndex < photos.length - 1) {
        setCurrentIndex(curr => curr + 1);
      } else {
        onClose();
      }
    } catch (error) {
      logger.error('Failed to save edited photo', error instanceof Error ? error : new Error(String(error)));
      showToast('Error saving photo. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col w-full h-full">
      {isSaving && (
        <div className="absolute inset-0 z-[60] bg-black/60 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <p className="text-white font-medium text-lg">Saving Photo...</p>
        </div>
      )}
      
      <div className="flex-1 w-full h-full relative">
        {/* We use a key based on the photo URL so Filerobot remounts for each new photo */}
        <FilerobotImageEditor
          key={activePhoto.id}
          source={activePhoto.url}
          onSave={handleSave}
          onClose={onClose}
          annotationsCommon={{
            fill: '#ff0000',
          }}
          Text={{ text: 'ClickFlash' }}
          Rotate={{ angle: 90, componentType: 'slider' }}
          tabsIds={[TABS.ADJUST, TABS.ANNOTATE, TABS.WATERMARK, TABS.FILTERS, TABS.FINETUNE, TABS.RESIZE]}
          defaultTabId={TABS.ADJUST}
          defaultToolId={TOOLS.CROP}
          savingPixelRatio={1}
          previewPixelRatio={1}
          theme={{
            palette: {
              'bg-primary-active': '#0f172a',
              'bg-secondary': '#1e293b',
              'icons-primary': '#94a3b8',
              'icons-secondary': '#64748b',
              'light-shadow': '#000000',
              'text-primary': '#f8fafc',
              'text-secondary': '#cbd5e1',
              'accent-primary': '#3b82f6',
              'accent-primary-hover': '#2563eb',
              'accent-primary-active': '#1d4ed8',
            }
          }}
        />
      </div>
      
      {/* Thumbnail Strip for Batch Editing */}
      {photos.length > 1 && (
        <div className="h-24 bg-slate-900 border-t border-slate-800 flex items-center px-4 overflow-x-auto gap-2">
          {photos.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => setCurrentIndex(idx)}
              className={`relative h-16 w-16 rounded-md overflow-hidden flex-shrink-0 border-2 transition-all ${
                idx === currentIndex ? 'border-blue-500 opacity-100' : 'border-transparent opacity-50 hover:opacity-100'
              }`}
            >
              <img src={p.thumbnailUrl || p.url} alt={p.title || p.id} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
