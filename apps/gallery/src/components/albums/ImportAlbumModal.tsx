
import React, { useState, useEffect, useRef } from 'react';
import Modal from '../common/Modal.tsx';
import { Album, Photographer, PhotoCategory } from '../../types.ts';
import Spinner from '../common/Spinner.tsx';
import { generateAlbumSuggestions } from '../../services/geminiService.ts';
import { fileToGenerativePart } from '../../utils/imageUtils.ts';
import { logger } from '../../utils/logger.ts';

interface ImportAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (albumData: Omit<Album, 'id' | 'photos' | 'coverPhotoUrl'>, photoFiles: File[]) => void;
  isOnline: boolean;
  photographers: Photographer[];
}

const ImportAlbumModal: React.FC<ImportAlbumModalProps> = ({ isOpen, onClose, onImport, isOnline, photographers }) => {
    const [step, setStep] = useState(1);
    const [selectedPhotographerId, setSelectedPhotographerId] = useState<string>('');
    const [sourceName, setSourceName] = useState('');
    
    const [isProcessingFiles, setIsProcessingFiles] = useState(false);
    const [processingMessage, setProcessingMessage] = useState("Processing photos...");
    
    const [photoFiles, setPhotoFiles] = useState<File[]>([]);
    const [photoPreviews, setPhotoPreviews] = useState<{id: string, url: string}[]>([]);

    const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
    
    // State for Step 4
    const [albumTitle, setAlbumTitle] = useState('');
    const [albumDescription, setAlbumDescription] = useState('');
    const [roomNumber, setRoomNumber] = useState('');
    const [categories, setCategories] = useState<PhotoCategory[]>(['Photo Session']);
    
    // AI State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiAnalysisDone, setAiAnalysisDone] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const blobUrlsRef = useRef<Set<string>>(new Set());
    
    const consistentInputStyle = "w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all";

    // Reset form state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSourceName('');
            setPhotoFiles([]);
            // Cleanup previous blob URLs before resetting
            blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
            blobUrlsRef.current.clear();
            setPhotoPreviews([]);
            setIsProcessingFiles(false);
            setSelectedPhotoIds(new Set());
            setAlbumTitle('');
            setAlbumDescription('');
            setRoomNumber('');
            setCategories(['Photo Session']);
            setAiAnalysisDone(false);
            setIsAnalyzing(false);
        }
    }, [isOpen]);

    // Handle default photographer selection safely
    useEffect(() => {
        if (isOpen && !selectedPhotographerId && photographers && photographers.length > 0) {
             setSelectedPhotographerId(String(photographers[0].id));
        }
    }, [isOpen, photographers, selectedPhotographerId]);

    // Cleanup blob URLs on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
            blobUrlsRef.current.clear();
        };
    }, []);

    const processFiles = async (files: File[], sourceLabel: string) => {
        setIsProcessingFiles(true);
        setSourceName(sourceLabel);
        setProcessingMessage("Processing photos...");
        
        setPhotoFiles(files);

        const previews = files.map(file => {
            const blobUrl = URL.createObjectURL(file);
            blobUrlsRef.current.add(blobUrl);
            return {
                id: `${file.name}-${file.lastModified}`,
                url: blobUrl
            };
        });
        setPhotoPreviews(previews);
        setSelectedPhotoIds(new Set(previews.map(p => p.id)));

        setIsProcessingFiles(false);
        setStep(3);
    };

    const handleFolderSelectionChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;
        const fileList = event.target.files as FileList;
        const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) {
            alert("No image files found in the selected folder.");
            return;
        }
        const firstFile = files[0]; 
        const rootPath = (firstFile as any).webkitRelativePath?.split('/')[0] || 'Device Folder';
        await processFiles(files, rootPath);
        if(event.target) event.target.value = '';
    };
    
    useEffect(() => {
        return () => {
            photoPreviews.forEach(p => URL.revokeObjectURL(p.url));
        };
    }, [photoPreviews]);

    const handleToggleSelection = (photoId: string) => {
        setSelectedPhotoIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(photoId)) newSet.delete(photoId);
            else newSet.add(photoId);
            return newSet;
        });
    };
    
    const runAIAnalysis = async () => {
        if (!isOnline) return;
        setIsAnalyzing(true);
        try {
            // Take up to 3 random selected photos for analysis
            const selectedIndices = photoFiles
                .map((_, idx) => idx)
                .filter(idx => selectedPhotoIds.has(photoPreviews[idx].id));
            
            const sampleIndices = selectedIndices.sort(() => 0.5 - Math.random()).slice(0, 3);
            const sampleFiles = sampleIndices.map(i => photoFiles[i]);

            if (sampleFiles.length === 0) throw new Error("No photos selected");

            const imageParts = await Promise.all(sampleFiles.map(f => fileToGenerativePart(f)));
            
            const suggestions = await generateAlbumSuggestions(imageParts);
            
            setAlbumTitle(suggestions.title);
            setAlbumDescription(suggestions.description);
            if (suggestions.categories && suggestions.categories.length > 0) {
                setCategories(suggestions.categories);
            }
            setAiAnalysisDone(true);
            
            // Auto-advance if we have good data
            setTimeout(() => setStep(4), 500);
            
        } catch (e) {
            logger.error("AI Analysis Failed", e instanceof Error ? e : undefined, { albumTitle, photographerId: selectedPhotographerId });
            alert("Could not analyze photos. Please enter details manually.");
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const handleFinalImport = () => {
        if (!albumTitle || !roomNumber || !selectedPhotographerId) {
            alert("Please provide a title, room number, and photographer.");
            return;
        }

        let selectedFiles = photoFiles.filter((_, index) => selectedPhotoIds.has(photoPreviews[index].id));

        const albumData: Omit<Album, 'id' | 'photos' | 'coverPhotoUrl'> = {
            title: albumTitle,
            // Store description in custom field if DB supports, or append to title for now
            // In a real schema update, we'd add 'description' to Album type
            date: new Date().toISOString().split('T')[0],
            photographerId: Number(selectedPhotographerId),
            source: sourceName,
            roomNumber: roomNumber,
            categories: categories,
        };
        onImport(albumData, selectedFiles);
        onClose();
    };

    const selectedPhotographer = photographers.find(p => String(p.id) === selectedPhotographerId);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import New Album" size="xl">
            <div className="mb-8 px-4">
                <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 dark:bg-slate-700 -z-10"></div>
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-4 transition-colors ${step >= s ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                            {step > s ? '✓' : s}
                        </div>
                    ))}
                </div>
                <div className="flex justify-between mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span>Photographer</span>
                    <span>Source</span>
                    <span>Selection</span>
                    <span>Details</span>
                </div>
            </div>

            {step === 1 && (
                 <div className="animate-fadeIn">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Who is shooting?</h2>
                        <p className="text-slate-500 dark:text-slate-400">Select the photographer for this session to track stats and payroll.</p>
                    </div>

                    <div className="max-w-md mx-auto space-y-6">
                        <div>
                            <label htmlFor="select-photographer" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Select Photographer</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-20">
                                    {selectedPhotographer ? (
                                        <img src={selectedPhotographer.avatarUrl} className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-slate-700" alt="" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        </div>
                                    )}
                                </div>

                                <select 
                                    id="select-photographer"
                                    value={selectedPhotographerId} 
                                    onChange={e => setSelectedPhotographerId(e.target.value)} 
                                    className="w-full pl-16 pr-10 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-lg text-slate-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none font-bold cursor-pointer transition-all hover:border-blue-400 dark:hover:border-blue-500 z-10 relative"
                                    required
                                >
                                    {!selectedPhotographerId && <option value="">Select a photographer...</option>}
                                    {photographers.length === 0 && <option value="" disabled>No photographers found</option>}
                                    {photographers.map(p => (<option key={p.id} value={String(p.id)}>{p.name}</option>))}
                                </select>
                                
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-blue-500 transition-colors z-20">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-700 mt-8">
                        <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors">Cancel</button>
                        <button onClick={() => setStep(2)} disabled={!selectedPhotographerId} className="px-8 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:shadow-none transition-all transform active:scale-95 hover:-translate-y-0.5">
                            Next Step
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="animate-fadeIn">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Where are the photos?</h2>
                        <p className="text-slate-500 dark:text-slate-400">Choose the source drive or folder to import from.</p>
                    </div>

                    {isProcessingFiles ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <Spinner />
                            <p className="mt-6 font-medium text-slate-600 dark:text-slate-300 animate-pulse">{processingMessage}</p>
                        </div>
                    ) : (
                        <>
                            <input type="file" ref={fileInputRef} onChange={handleFolderSelectionChange} className="hidden" {...{ webkitdirectory: "true", directory: "true" }} />
                            <div className="flex justify-center w-full">
                                <button 
                                    onClick={() => fileInputRef.current?.click()} 
                                    className="group w-full max-w-md flex flex-col items-center justify-center p-10 border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all hover:scale-[1.02]"
                                >
                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                                    </div>
                                    <span className="text-xl font-bold text-slate-800 dark:text-white mb-1">Local Device / USB</span>
                                    <span className="text-sm text-slate-500 dark:text-slate-400">Import from SD Card or Hard Drive</span>
                                </button>
                            </div>
                        </>
                    )}
                    <div className="pt-8 flex justify-between space-x-3 border-t border-slate-200 dark:border-slate-700 mt-8">
                        <button onClick={() => setStep(1)} className="px-6 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">Back</button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="animate-fadeIn flex flex-col h-full">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Review Selection</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">{photoPreviews.length} photos found in <span className="font-mono font-bold">{sourceName}</span>.</p>
                        </div>
                        <div className="flex space-x-2">
                            {isOnline && (
                                <button 
                                    onClick={runAIAnalysis} 
                                    disabled={isAnalyzing}
                                    className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded hover:shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Analyzing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            <span>Auto-Identify with AI</span>
                                        </>
                                    )}
                                </button>
                            )}
                            <button onClick={() => setSelectedPhotoIds(new Set(photoPreviews.map(p => p.id)))} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300 transition-colors">Select All</button>
                            <button onClick={() => setSelectedPhotoIds(new Set())} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300 transition-colors">Deselect All</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 md:grid-cols-6 gap-3 mb-6 overflow-y-auto pr-2 max-h-[400px] content-start">
                        {photoPreviews.map(photo => (
                            <div key={photo.id} className="relative group aspect-square cursor-pointer" onClick={() => handleToggleSelection(photo.id)}>
                                <img src={photo.url} alt="preview" className={`w-full h-full object-cover rounded-lg shadow-sm transition-all ${selectedPhotoIds.has(photo.id) ? 'brightness-100' : 'brightness-75 group-hover:brightness-100'}`} />
                                <div className={`absolute inset-0 rounded-lg border-2 transition-all ${selectedPhotoIds.has(photo.id) ? 'border-blue-500 bg-blue-500/20' : 'border-transparent group-hover:bg-white/10'}`}>
                                    {selectedPhotoIds.has(photo.id) && (
                                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 flex justify-between space-x-3 border-t border-slate-200 dark:border-slate-700 mt-auto">
                        <button onClick={() => setStep(2)} className="px-6 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">Back</button>
                        <button onClick={() => setStep(4)} disabled={selectedPhotoIds.size === 0} className="px-8 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:shadow-none transition-all transform active:scale-95 flex items-center">
                            <span>Next Step</span>
                            <span className="ml-2 bg-blue-700 px-2 py-0.5 rounded text-xs">{selectedPhotoIds.size}</span>
                        </button>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="animate-fadeIn">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Final Details</h2>
                        <p className="text-slate-500 dark:text-slate-400">Enter session metadata to organize this album.</p>
                        {aiAnalysisDone && (
                            <div className="mt-3 inline-flex items-center bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-xs font-bold">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                Data Auto-Filled by Gemini AI
                            </div>
                        )}
                    </div>

                    <div className="max-w-md mx-auto space-y-6">
                        <div>
                            <label htmlFor="album-title" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Album Title</label>
                            <div className="relative">
                                <input 
                                    id="album-title"
                                    type="text" 
                                    value={albumTitle} 
                                    onChange={e => setAlbumTitle(e.target.value)} 
                                    className={consistentInputStyle} 
                                    placeholder="e.g. Smith Family Sunset"
                                    autoComplete="off"
                                />
                                {isOnline && !albumTitle && !aiAnalysisDone && (
                                    <button 
                                        onClick={runAIAnalysis} 
                                        disabled={isAnalyzing}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-purple-500 hover:text-purple-700 disabled:opacity-50"
                                        title="Auto-generate title with AI"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="room-number" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Room Number / Client ID</label>
                            <input 
                                id="room-number"
                                type="text" 
                                value={roomNumber} 
                                onChange={e => setRoomNumber(e.target.value)} 
                                className={consistentInputStyle} 
                                placeholder="e.g. 101" 
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label htmlFor="album-description" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Description (Optional)</label>
                            <textarea 
                                id="album-description"
                                value={albumDescription} 
                                onChange={e => setAlbumDescription(e.target.value)} 
                                className={`${consistentInputStyle} h-24 resize-none`} 
                                placeholder="Brief notes about the session..." 
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Tags</label>
                            <div className="flex flex-wrap gap-2">
                                {categories.map((cat, idx) => (
                                    <span key={idx} className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-xs font-semibold px-2.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                        {cat}
                                    </span>
                                ))}
                                {categories.length === 0 && <span className="text-xs text-slate-400 italic">No tags generated</span>}
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 flex justify-between space-x-3 border-t border-slate-200 dark:border-slate-700 mt-8">
                        <button onClick={() => setStep(3)} className="px-6 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">Back</button>
                        <button onClick={handleFinalImport} disabled={!albumTitle.trim() || !roomNumber.trim()} className="px-8 py-3 rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:shadow-none transition-all transform active:scale-95">
                            Complete Import
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default ImportAlbumModal;
