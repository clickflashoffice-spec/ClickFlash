import { Modal } from '@clickflash/ui';
import React, { useState } from 'react';

import { Photo } from '../../types';

interface ProofingModalProps {
    isOpen: boolean;
    onClose: () => void;
    photos: Photo[];
    onUpdateProofingStatus: (photoId: string, status: 'approved' | 'rejected' | 'pending') => void;
}

const ProofingModal: React.FC<ProofingModalProps> = ({
    isOpen,
    onClose,
    photos,
    onUpdateProofingStatus
}) => {
    const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

    const filteredPhotos = photos.filter(photo => {
        if (filter === 'all') return true;
        return photo.proofingStatus === filter || (!photo.proofingStatus && filter === 'pending');
    });

    const togglePhotoSelection = (photoId: string) => {
        setSelectedPhotos(prev => {
            const newSet = new Set(prev);
            if (newSet.has(photoId)) {
                newSet.delete(photoId);
            } else {
                newSet.add(photoId);
            }
            return newSet;
        });
    };

    const selectAll = () => {
        setSelectedPhotos(new Set(filteredPhotos.map(p => p.id)));
    };

    const deselectAll = () => {
        setSelectedPhotos(new Set());
    };

    const handleBulkAction = (status: 'approved' | 'rejected' | 'pending') => {
        selectedPhotos.forEach(photoId => {
            onUpdateProofingStatus(photoId, status);
        });
        setSelectedPhotos(new Set());
    };

    const approvedCount = photos.filter(p => p.proofingStatus === 'approved').length;
    const rejectedCount = photos.filter(p => p.proofingStatus === 'rejected').length;
    const pendingCount = photos.filter(p => !p.proofingStatus || p.proofingStatus === 'pending').length;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Artistic Review" size="xl">
            <div className="space-y-8 animate-fade-in-down pb-6">
                {/* Cinematic Stats Bar */}
                <div className="grid grid-cols-4 gap-4 p-6 bg-white/5 border border-white/5 rounded-3xl backdrop-blur-md">
                    <div className="text-center group">
                        <div className="text-2xl font-black text-white italic tracking-tighter transition-transform group-hover:scale-110">{photos.length}</div>
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Total Assets</div>
                    </div>
                    <div className="text-center group">
                        <div className="text-2xl font-black text-yellow-500 italic tracking-tighter transition-transform group-hover:scale-110">{pendingCount}</div>
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Pending</div>
                    </div>
                    <div className="text-center group">
                        <div className="text-2xl font-black text-green-500 italic tracking-tighter transition-transform group-hover:scale-110">{approvedCount}</div>
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Approved</div>
                    </div>
                    <div className="text-center group">
                        <div className="text-2xl font-black text-red-500 italic tracking-tighter transition-transform group-hover:scale-110">{rejectedCount}</div>
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Rejected</div>
                    </div>
                </div>

                {/* Filter and Bulk Actions */}
                <div className="flex flex-wrap justify-between items-center gap-6">
                    <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filter === f
                                    ? 'bg-cyan-500 text-white shadow-lg border border-cyan-400/50'
                                    : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {selectedPhotos.size > 0 && (
                        <div className="flex space-x-2 animate-fade-in-down">
                            <button
                                onClick={() => handleBulkAction('approved')}
                                className="px-5 py-2.5 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg border border-green-400/50 hover:bg-green-400 transition-all"
                            >
                                Approve ({selectedPhotos.size})
                            </button>
                            <button
                                onClick={() => handleBulkAction('rejected')}
                                className="px-5 py-2.5 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg border border-red-400/50 hover:bg-red-400 transition-all"
                            >
                                Reject
                            </button>
                        </div>
                    )}
                </div>

                {/* Select All / Deselect All */}
                <div className="flex justify-between items-center px-2">
                    <div className="flex space-x-4">
                        <button onClick={selectAll} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-cyan-400 transition-colors">Select All</button>
                        <button onClick={deselectAll} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Deselect All</button>
                    </div>
                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                        {selectedPhotos.size} Assets Targeted
                    </div>
                </div>

                {/* Photo Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 max-h-[50vh] overflow-y-auto px-2 pb-4 scrollbar-thin scrollbar-thumb-white/10">
                    {filteredPhotos.map(photo => {
                        const isSelected = selectedPhotos.has(photo.id);
                        return (
                            <div
                                key={photo.id}
                                className={`relative group cursor-pointer aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300 ${isSelected
                                    ? 'border-cyan-500 ring-4 ring-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.3)]'
                                    : 'border-white/5 hover:border-white/20'
                                    }`}
                                onClick={() => togglePhotoSelection(photo.id)}
                            >
                                <img
                                    src={photo.url}
                                    alt={photo.title}
                                    className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${isSelected ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`}
                                />

                                {photo.proofingStatus && (
                                    <div className={`absolute top-1.5 right-1.5 p-1 rounded-md shadow-lg ${photo.proofingStatus === 'approved' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                        }`}>
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            {photo.proofingStatus === 'approved'
                                                ? <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                : <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            }
                                        </svg>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onUpdateProofingStatus(photo.id, 'approved'); }}
                                        className="p-1.5 bg-green-500/80 hover:bg-green-500 text-white rounded-lg transition-colors border border-green-400/30"
                                        title="Approve Photo"
                                        aria-label="Approve Photo"
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onUpdateProofingStatus(photo.id, 'rejected'); }}
                                        className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-colors border border-red-400/30"
                                        title="Reject Photo"
                                        aria-label="Reject Photo"
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredPhotos.length === 0 && (
                    <div className="text-center py-20 glass-panel rounded-3xl border-dashed border-2 border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Zero entries for this segment.</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ProofingModal;
