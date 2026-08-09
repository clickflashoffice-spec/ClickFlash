import { Modal } from "@clickflash/ui";

import React, { useState, useMemo } from 'react';

import { FileSystemItem, Photo } from '../../types.ts';
import { MOCK_FILE_SYSTEM } from '../../constants.ts';
import LazyImage from '../common/LazyImage';

interface FileBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolder: (photos: Photo[]) => void;
}

const FolderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-yellow-400 drop-shadow-sm" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
  </svg>
);

const PhotoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-400 drop-shadow-sm" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
  </svg>
);

const FileBrowserModal: React.FC<FileBrowserModalProps> = ({ isOpen, onClose, onSelectFolder }) => {
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  
  // Resolve the current folder contents based on the path
  const currentFolder = useMemo(() => {
    let target: FileSystemItem | undefined = { 
        name: 'This PC', 
        type: 'folder', 
        path: 'root', 
        children: MOCK_FILE_SYSTEM 
    };

    for (const segment of currentPath) {
      if (target && target.children) {
        target = target.children.find(child => child.name === segment);
      }
    }
    return target;
  }, [currentPath]);

  const handleNavigate = (folderName: string) => {
    setCurrentPath([...currentPath, folderName]);
  };

  const handleNavigateUp = () => {
    setCurrentPath(currentPath.slice(0, -1));
  };

  const handleSelectCurrentFolder = () => {
    if (!currentFolder || !currentFolder.children) return;
    
    const photosInFolder = currentFolder.children
      .filter(item => item.type === 'photo' && item.photo)
      .map(item => item.photo!);

    if (photosInFolder.length === 0) {
      alert("No photos found in this folder.");
      return;
    }
    
    onSelectFolder(photosInFolder);
  };

  const photosCount = currentFolder?.children?.filter(c => c.type === 'photo').length || 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="File Explorer - Simulated Device" size="xl">
      <div className="flex flex-col h-[60vh] border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        {/* Toolbar / Breadcrumbs */}
        <div className="flex items-center space-x-2 p-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <button 
            onClick={handleNavigateUp} 
            disabled={currentPath.length === 0}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
            title="Up one level"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
          <div className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded font-mono text-sm truncate flex items-center select-text">
             <span className="text-blue-600 dark:text-blue-400 mr-1 cursor-pointer hover:underline" onClick={() => setCurrentPath([])}>This PC</span>
             {currentPath.map((segment, i) => (
                 <React.Fragment key={i}>
                     <span className="text-slate-400 mx-1">/</span>
                     <span 
                        className="cursor-pointer hover:underline text-slate-700 dark:text-slate-200"
                        onClick={() => setCurrentPath(currentPath.slice(0, i + 1))}
                     >
                        {segment}
                     </span>
                 </React.Fragment>
             ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-slate-900">
           <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
             {currentFolder?.children?.map((item) => (
               <div 
                 key={item.name} 
                 className="flex flex-col items-center p-3 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer text-center group transition-colors border border-transparent hover:border-blue-100 dark:hover:border-slate-700"
                 onDoubleClick={() => item.type === 'folder' ? handleNavigate(item.name) : null}
               >
                 <div className="mb-2 transition-transform group-hover:scale-105 relative">
                    {item.type === 'folder' ? (
                        <FolderIcon />
                    ) : (
                        item.photo ? (
                             <LazyImage src={item.photo.url} alt={item.name} placeholder="skeleton" rootMargin="50px" className="w-14 h-14 object-cover rounded border-2 border-white dark:border-slate-700 shadow-sm" />
                        ) : (
                             <PhotoIcon />
                        )
                    )}
                 </div>
                 <span className="text-xs truncate w-full px-1 select-none font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
               </div>
             ))}
             
             {(!currentFolder?.children || currentFolder.children.length === 0) && (
                 <div className="col-span-full flex flex-col items-center justify-center text-slate-400 py-20">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                     </svg>
                     <span>This folder is empty.</span>
                 </div>
             )}
           </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
            <div className="text-sm text-slate-500 dark:text-slate-400">
                {photosCount} photos in current folder
            </div>
            <div className="space-x-3">
                <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold rounded-lg transition-colors">
                    Cancel
                </button>
                <button 
                    onClick={handleSelectCurrentFolder}
                    disabled={photosCount === 0}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                    <span>Import Current Folder</span>
                    {photosCount > 0 && <span className="ml-2 bg-white/20 text-xs px-2 py-0.5 rounded-full">{photosCount}</span>}
                </button>
            </div>
        </div>
      </div>
    </Modal>
  );
};

export default FileBrowserModal;
