import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Book, LayoutTemplate, ArrowLeftRight, Download, Wand2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Spinner } from '@clickflash/ui';

interface Photo {
  id: string;
  url: string;
  score: number;
}

interface Page {
  id: string;
  type: 'cover' | 'spread' | 'back';
  photos: Photo[];
  layout: 'single' | 'split' | 'grid';
}

interface AIPhotobookEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  albumPhotos: Photo[];
  onExportPdf?: (pages: Page[]) => void;
}

export const AIPhotobookEngineModal: React.FC<AIPhotobookEngineModalProps> = ({
  isOpen,
  onClose,
  albumPhotos,
  onExportPdf
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const handleAutoGenerate = () => {
    setIsGenerating(true);
    // Simulate AI selection and layout generation
    setTimeout(() => {
      // Sort by score
      const sortedPhotos = [...albumPhotos].sort((a, b) => b.score - a.score);
      const topPhotos = sortedPhotos.slice(0, Math.min(10, sortedPhotos.length));
      
      const generatedPages: Page[] = [];
      
      if (topPhotos.length > 0) {
        // Cover
        generatedPages.push({
          id: 'cover',
          type: 'cover',
          photos: [topPhotos[0]],
          layout: 'single'
        });
        
        // Spreads
        for (let i = 1; i < topPhotos.length - 1; i += 2) {
          generatedPages.push({
            id: `spread-${i}`,
            type: 'spread',
            photos: [topPhotos[i], topPhotos[i+1] || topPhotos[i]],
            layout: 'split'
          });
        }
        
        // Back cover
        if (topPhotos.length > 1) {
          generatedPages.push({
            id: 'back',
            type: 'back',
            photos: [topPhotos[topPhotos.length - 1]],
            layout: 'single'
          });
        }
      }
      
      setPages(generatedPages);
      setCurrentPageIndex(0);
      setIsGenerating(false);
    }, 1500);
  };

  const handleExport = () => {
    if (onExportPdf) {
      onExportPdf(pages);
    }
    onClose();
  };

  const currentPage = pages[currentPageIndex];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex text-white"
      >
        <div className="flex-1 flex flex-col relative h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-900/80">
            <div className="flex items-center space-x-3">
              <Book className="w-5 h-5 text-indigo-400" />
              <h2 className="font-semibold text-lg">Neural AI Photobook Engine</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <X className="w-6 h-6 text-slate-300 hover:text-white" />
            </button>
          </div>

          {/* Main Area */}
          <div className="flex-1 p-6 flex flex-col items-center justify-center overflow-hidden bg-slate-900/50">
            {pages.length === 0 ? (
              <div className="text-center max-w-md">
                <Wand2 className="w-16 h-16 text-indigo-500 mx-auto mb-6 opacity-80" />
                <h3 className="text-xl font-medium mb-2">Ready to curate your photobook?</h3>
                <p className="text-slate-400 mb-8">
                  Our AI will select the top-scoring photos, apply rule-of-thirds layouts, and face-aware cropping to create a stunning physical book.
                </p>
                <Button 
                  onClick={handleAutoGenerate}
                  disabled={isGenerating || albumPhotos.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-500 px-8 py-3 text-lg w-full"
                >
                  {isGenerating ? <Spinner className="w-5 h-5 mr-2 inline-block" /> : <Wand2 className="w-5 h-5 mr-2 inline-block" />}
                  {isGenerating ? 'Analyzing Photos...' : 'Auto-Generate Book'}
                </Button>
              </div>
            ) : (
              <div className="w-full max-w-5xl flex flex-col items-center">
                {/* Book Preview */}
                <div className="relative w-full aspect-[2/1] bg-slate-800 rounded-lg shadow-2xl flex items-center justify-center border border-slate-700 overflow-hidden">
                  {/* Book spine line for spreads */}
                  {currentPage?.type === 'spread' && (
                    <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-900/50 z-10 shadow-[0_0_10px_rgba(0,0,0,0.5)]" />
                  )}
                  
                  {currentPage?.layout === 'single' && (
                    <div className="w-1/2 h-full p-8 flex items-center justify-center">
                      <img 
                        src={currentPage.photos[0]?.url} 
                        alt="Page layout" 
                        className="max-w-full max-h-full object-cover shadow-lg"
                      />
                    </div>
                  )}
                  
                  {currentPage?.layout === 'split' && (
                    <div className="w-full h-full flex">
                      <div className="w-1/2 h-full p-6 flex items-center justify-center">
                        <img 
                          src={currentPage.photos[0]?.url} 
                          alt="Left page" 
                          className="max-w-full max-h-full object-cover shadow-lg"
                        />
                      </div>
                      <div className="w-1/2 h-full p-6 flex items-center justify-center">
                        <img 
                          src={currentPage.photos[1]?.url} 
                          alt="Right page" 
                          className="max-w-full max-h-full object-cover shadow-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center space-x-6 mt-8">
                  <button 
                    onClick={() => setCurrentPageIndex(p => Math.max(0, p - 1))}
                    disabled={currentPageIndex === 0}
                    className="p-2 bg-slate-800 rounded-full disabled:opacity-50 hover:bg-slate-700 transition"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <span className="text-slate-300 font-medium">
                    {currentPage?.type === 'cover' ? 'Cover' : 
                     currentPage?.type === 'back' ? 'Back Cover' : 
                     `Spread ${currentPageIndex}`} 
                    <span className="text-slate-500 ml-2">({currentPageIndex + 1} of {pages.length})</span>
                  </span>
                  <button 
                    onClick={() => setCurrentPageIndex(p => Math.min(pages.length - 1, p + 1))}
                    disabled={currentPageIndex === pages.length - 1}
                    className="p-2 bg-slate-800 rounded-full disabled:opacity-50 hover:bg-slate-700 transition"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-slate-900 border-l border-white/10 flex flex-col h-full shadow-2xl">
          <div className="p-4 border-b border-white/10">
            <h3 className="font-medium text-slate-200">Page Tools</h3>
          </div>
          
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {pages.length > 0 ? (
              <>
                <Button variant="outline" className="w-full justify-start text-sm border-slate-700 hover:bg-slate-800">
                  <ArrowLeftRight className="w-4 h-4 mr-2" />
                  Swap Photos
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm border-slate-700 hover:bg-slate-800">
                  <LayoutTemplate className="w-4 h-4 mr-2" />
                  Change Layout
                </Button>
                
                <div className="mt-8">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Book Outline</h4>
                  <div className="space-y-2">
                    {pages.map((p, idx) => (
                      <button
                        key={p.id}
                        onClick={() => setCurrentPageIndex(idx)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition ${
                          idx === currentPageIndex 
                            ? 'bg-indigo-500/20 text-indigo-300' 
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                        }`}
                      >
                        {p.type === 'cover' ? 'Front Cover' : p.type === 'back' ? 'Back Cover' : `Spread ${idx}`}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500 text-center mt-10">
                Generate the photobook to see editing tools.
              </p>
            )}
          </div>

          <div className="p-4 border-t border-white/10">
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center space-x-2"
              onClick={handleExport}
              disabled={pages.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              <span>Export PDF for Print</span>
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AIPhotobookEngineModal;
