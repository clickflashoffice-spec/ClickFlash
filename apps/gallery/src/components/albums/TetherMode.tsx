
import React, { useState, useEffect, useRef } from 'react';
import { Photo } from '../../types.ts';

interface TetherModeProps {
    onClose: () => void;
    onSaveSession: (photos: Photo[]) => void;
    photographerId: number;
}

const TetherMode: React.FC<TetherModeProps> = ({ onClose, onSaveSession, photographerId }) => {
    const [capturedPhotos, setCapturedPhotos] = useState<Photo[]>([]);
    const [isLive, setIsLive] = useState(true);
    const [selectedCamera, setSelectedCamera] = useState('Canon EOS R5 (USB)');
    const [flashActive, setFlashActive] = useState(false);
    const listEndRef = useRef<HTMLDivElement>(null);

    // Generate a placeholder image locally (Offline-safe)
    const generateMockImage = (width: number, height: number, text: string) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Random pastel background
            const hue = Math.floor(Math.random() * 360);
            ctx.fillStyle = `hsl(${hue}, 60%, 80%)`;
            ctx.fillRect(0, 0, width, height);
            
            // Text
            ctx.fillStyle = '#334155';
            ctx.font = 'bold 60px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, width / 2, height / 2);
            
            // Subtext
            ctx.font = '30px sans-serif';
            ctx.fillText("Captured via Tether", width / 2, height / 2 + 50);
        }
        return canvas.toDataURL('image/jpeg', 0.8);
    };

    // Simulate incoming photos
    useEffect(() => {
        if (!isLive) return;

        const interval = setInterval(() => {
            const newId = Date.now();
            const imageName = `DSC_${newId}.JPG`;
            
            // Use local generation instead of picsum to avoid "Failed to fetch" when offline
            const photoUrl = generateMockImage(1200, 800, imageName);

            const newPhoto: Photo = {
                id: `tether-${newId}`,
                albumId: '',
                title: imageName,
                url: photoUrl,
                photographerId
            };
            setCapturedPhotos(prev => [...prev, newPhoto]);
            
            // Trigger Flash
            setFlashActive(true);
            setTimeout(() => setFlashActive(false), 250); // Flash duration 250ms

        }, 4000); // New photo every 4s

        return () => clearInterval(interval);
    }, [isLive, photographerId]);

    useEffect(() => {
        if (listEndRef.current) {
            listEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [capturedPhotos]);

    const latestPhoto = capturedPhotos.length > 0 ? capturedPhotos[capturedPhotos.length - 1] : null;

    return (
        <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col text-white font-sans">
            {/* Flash Overlay */}
            <div className={`absolute inset-0 bg-white pointer-events-none z-50 transition-opacity duration-100 ease-out ${flashActive ? 'opacity-90' : 'opacity-0'}`}></div>

            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800 z-40 shadow-md">
                <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)] ${isLive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <h1 className="text-xl font-bold tracking-wide">Live Tether Session</h1>
                    <div className="px-3 py-1 bg-slate-700 rounded flex items-center space-x-2 border border-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <select 
                            value={selectedCamera} 
                            onChange={(e) => setSelectedCamera(e.target.value)}
                            className="bg-transparent border-none text-sm font-semibold focus:ring-0 text-slate-200 outline-none"
                        >
                            <option>Canon EOS R5 (USB)</option>
                            <option>Nikon Z9 (Wireless)</option>
                            <option>Sony A7IV (USB)</option>
                        </select>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button onClick={() => setIsLive(!isLive)} className={`px-4 py-2 rounded font-bold transition-colors ${isLive ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                        {isLive ? 'Pause Capture' : 'Resume Capture'}
                    </button>
                    <button onClick={() => onSaveSession(capturedPhotos)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-lg shadow-blue-900/20">
                        Finish & Import ({capturedPhotos.length})
                    </button>
                    <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors">
                        Cancel
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Main Preview Area */}
                <div className="flex-1 bg-black flex items-center justify-center p-8 relative overflow-hidden">
                    {latestPhoto ? (
                        <div className="relative max-w-full max-h-full flex items-center justify-center animate-fadeIn">
                             <img 
                                src={latestPhoto.url} 
                                alt="Latest Capture" 
                                className="max-w-full max-h-[80vh] object-contain border-4 border-slate-800 shadow-2xl" 
                            />
                             <div className="absolute top-4 left-4 bg-black/60 px-4 py-2 rounded-lg text-sm font-mono backdrop-blur-md flex items-center space-x-3 border border-white/10 shadow-lg">
                                 <span className="font-bold text-green-400">RAW+JPG</span>
                                 <span className="text-slate-300">{latestPhoto.title}</span>
                             </div>
                             <div className="absolute bottom-4 right-4 bg-black/60 px-4 py-2 rounded-lg text-xs font-mono backdrop-blur-md text-slate-400 border border-white/10 shadow-lg">
                                 1/200 • f/2.8 • ISO 100 • 50mm
                             </div>
                        </div>
                    ) : (
                        <div className="text-slate-600 flex flex-col items-center">
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <div className="absolute top-0 right-0 -mt-2 -mr-2 w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
                            </div>
                            <p className="text-2xl font-light animate-pulse">Waiting for camera trigger...</p>
                            <p className="text-sm mt-2 opacity-60 font-mono">Listening on USB Port 1</p>
                        </div>
                    )}
                </div>

                {/* Filmstrip / List */}
                <div className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col z-30 shadow-2xl">
                    <div className="p-4 border-b border-slate-700 font-bold text-slate-300 bg-slate-800 flex justify-between items-center">
                        <span>Session Feed</span>
                        <span className="text-xs font-mono bg-black/30 border border-white/10 px-2 py-0.5 rounded text-slate-400">{capturedPhotos.length} Shots</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-900">
                        {capturedPhotos.map((photo, index) => (
                            <div key={photo.id} className="flex items-center p-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 cursor-pointer transition-colors group">
                                <span className="text-xs text-slate-500 w-6 text-center mr-2 font-mono">{index + 1}</span>
                                <div className="w-16 h-12 bg-black rounded overflow-hidden relative border border-slate-600 group-hover:border-blue-500">
                                     <img src={photo.url} className="w-full h-full object-cover" />
                                </div>
                                <div className="ml-3 overflow-hidden flex-1">
                                    <p className="text-xs font-bold text-slate-300 truncate group-hover:text-blue-400 transition-colors">{photo.title}</p>
                                    <p className="text-[10px] text-slate-500">1/200 • f/2.8</p>
                                </div>
                            </div>
                        ))}
                        <div ref={listEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TetherMode;
