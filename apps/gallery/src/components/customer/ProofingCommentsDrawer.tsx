import React, { useState } from 'react';

import { Photo } from '../../types';

interface Comment {
    id: string;
    text: string;
    tag?: string;
    author: string;
    timestamp: Date;
}

interface ProofingCommentsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    photo: Photo | null;
    comments: Comment[];
    onAddComment: (photoId: string, text: string, tag?: string) => void;
    onUpdateStatus: (photoId: string, status: 'Approved' | 'Modifications Requested' | 'Pending Review') => void;
    currentStatus: 'Approved' | 'Modifications Requested' | 'Pending Review';
}

const QUICK_TAGS = ['Favorite', 'Needs Crop', 'Retouch Request', 'Color Correction'];

const ProofingCommentsDrawer: React.FC<ProofingCommentsDrawerProps> = ({
    isOpen,
    onClose,
    photo,
    comments,
    onAddComment,
    onUpdateStatus,
    currentStatus
}) => {
    const [newComment, setNewComment] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | undefined>();

    if (!isOpen || !photo) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() && !selectedTag) return;
        
        onAddComment(photo.id, newComment, selectedTag);
        setNewComment('');
        setSelectedTag(undefined);
    };

    const statusColors = {
        'Approved': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        'Modifications Requested': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        'Pending Review': 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
    };

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/20 z-40 transition-opacity"
                onClick={onClose}
            />
            
            {/* Drawer */}
            <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-800">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <div>
                        <h2 className="font-bold text-slate-800 dark:text-slate-100">Review Notes</h2>
                        <p className="text-xs text-slate-500">{photo.title || photo.id}</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Status Bar */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Status</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusColors[currentStatus]}`}>
                            {currentStatus}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => onUpdateStatus(photo.id, 'Approved')}
                            className="flex-1 py-1.5 text-xs font-semibold rounded bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 transition-colors border border-green-200 dark:border-green-900/50"
                        >
                            Approve
                        </button>
                        <button 
                            onClick={() => onUpdateStatus(photo.id, 'Modifications Requested')}
                            className="flex-1 py-1.5 text-xs font-semibold rounded bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/40 transition-colors border border-orange-200 dark:border-orange-900/50"
                        >
                            Request Edit
                        </button>
                    </div>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {comments.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            No notes yet. Add your requests below.
                        </div>
                    ) : (
                        comments.map(comment => (
                            <div key={comment.id} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{comment.author}</span>
                                    <span className="text-xs text-slate-400">{comment.timestamp.toLocaleDateString()}</span>
                                </div>
                                {comment.tag && (
                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 mb-2">
                                        {comment.tag}
                                    </span>
                                )}
                                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{comment.text}</p>
                            </div>
                        ))
                    )}
                </div>

                {/* Add Comment Input */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="mb-3 flex flex-wrap gap-2">
                        {QUICK_TAGS.map(tag => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => setSelectedTag(tag === selectedTag ? undefined : tag)}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors border ${
                                    tag === selectedTag 
                                    ? 'bg-blue-500 text-white border-blue-500' 
                                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600'
                                }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add editing note or comment..."
                            className="flex-1 max-h-32 min-h-[44px] px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            rows={1}
                        />
                        <button
                            type="submit"
                            disabled={!newComment.trim() && !selectedTag}
                            className="self-end p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
};

export default ProofingCommentsDrawer;
