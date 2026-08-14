import { Modal, Toast } from '@clickflash/ui';
import React, { useState } from 'react';

import { Photo } from '../../types';
import { 
    shareToFacebook, 
    copyToClipboard,
    generateShareableUrl,
    ShareOptions
} from '../../utils/shareUtils';

interface SocialShareV2ModalProps {
    isOpen: boolean;
    onClose: () => void;
    photo: Photo;
    galleryId: string;
    galleryTitle?: string;
    resortName?: string;
}

const FRAMES = [
    { id: 'none', label: 'No Frame', url: '' },
    { id: 'resort-logo', label: 'Resort Logo', url: '/frames/resort-logo.png' },
    { id: 'sunset-border', label: 'Sunset Border', url: '/frames/sunset-border.png' },
    { id: 'beach-memories', label: 'Beach Memories', url: '/frames/beach-memories.png' }
];

const SocialShareV2Modal: React.FC<SocialShareV2ModalProps> = ({ 
    isOpen, 
    onClose, 
    photo, 
    galleryId, 
    galleryTitle,
    resortName = 'Our Resort'
}) => {
    const [selectedFrame, setSelectedFrame] = useState(FRAMES[0]);
    const [copied, setCopied] = useState(false);
    
    const shareUrl = generateShareableUrl(galleryId, photo?.id);
    const shareTitle = photo ? photo.title : (galleryTitle || 'Photo Gallery');
    const shareImageUrl = photo?.url || '';
    
    const shareOptions: ShareOptions = {
        url: shareUrl,
        title: shareTitle,
        description: `Check out this amazing photo from ${resortName}!`,
        imageUrl: shareImageUrl,
    };
    
    const unlockDiscount = () => {
        const now = Date.now();
        localStorage.setItem('clickflash_share15_unlocked', 'true');
        localStorage.setItem('clickflash_share15_expires', (now + 15 * 60 * 1000).toString());
    };

    const handleCopyLink = async () => {
        const success = await copyToClipboard(shareUrl);
        if (success) {
            setCopied(true);
            unlockDiscount();
            setTimeout(() => setCopied(false), 2000);
        } else {
            alert('Failed to copy link. Please try again.');
        }
    };
    
    const handlePlatformShare = (platform: string) => {
        unlockDiscount();
        if (platform === 'facebook') {
            shareToFacebook(shareOptions);
        } else if (platform === 'whatsapp') {
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareOptions.description + ' ' + shareOptions.url)}`, '_blank');
        } else if (platform === 'twitter' || platform === 'tiktok' || platform === 'instagram') {
             // For platforms that just need the media and URL natively
             alert(`Open ${platform} to share this image!`);
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Share Your Memories" size="lg">
            <div className="space-y-6">
                {/* Promo Code Banner */}
                <div className="bg-gradient-to-r from-pink-500 to-orange-400 p-4 rounded-xl text-white text-center shadow-lg">
                    <h4 className="font-bold text-lg mb-1">Get 15% Off Your Next Purchase!</h4>
                    <p className="text-sm opacity-90">Share this photo and use code <strong className="bg-white/20 px-2 py-1 rounded">SHARE15</strong> at checkout.</p>
                </div>

                {/* Photo Preview & Frame Selection */}
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                            {photo && <img src={photo.url} alt="Share preview" className="max-w-full max-h-full object-contain" />}
                            {selectedFrame.id !== 'none' && (
                                <div className="absolute inset-0 pointer-events-none border-8 border-white/20 p-4 flex flex-col justify-between">
                                     <div className="text-white/80 font-bold text-xl drop-shadow-md">
                                        {selectedFrame.id === 'sunset-border' && '🌅'}
                                        {selectedFrame.id === 'beach-memories' && '🏖️'}
                                     </div>
                                     <div className="text-white/80 font-bold text-lg drop-shadow-md self-end">
                                        {resortName}
                                     </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="w-full md:w-48 space-y-3">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Branded Frame</h3>
                        <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                            {FRAMES.map(frame => (
                                <button
                                    key={frame.id}
                                    onClick={() => setSelectedFrame(frame)}
                                    className={`px-3 py-2 text-sm rounded-lg border text-left transition-all ${
                                        selectedFrame.id === frame.id 
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                                        : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                                    }`}
                                >
                                    {frame.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Social Share Buttons */}
                <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Share To</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <button onClick={() => handlePlatformShare('instagram')} className="flex flex-col items-center justify-center p-3 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 text-white hover:opacity-90 transition-opacity">
                            <span className="font-bold text-xs mt-1">IG Story</span>
                        </button>
                        <button onClick={() => handlePlatformShare('tiktok')} className="flex flex-col items-center justify-center p-3 rounded-xl bg-black text-white hover:opacity-90 transition-opacity">
                            <span className="font-bold text-xs mt-1">TikTok</span>
                        </button>
                        <button onClick={() => handlePlatformShare('whatsapp')} className="flex flex-col items-center justify-center p-3 rounded-xl bg-green-500 text-white hover:opacity-90 transition-opacity">
                            <span className="font-bold text-xs mt-1">WhatsApp</span>
                        </button>
                        <button onClick={() => handlePlatformShare('facebook')} className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-600 text-white hover:opacity-90 transition-opacity">
                            <span className="font-bold text-xs mt-1">Facebook</span>
                        </button>
                        <button onClick={handleCopyLink} className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                            <span className="font-bold text-xs mt-1">Copy Link</span>
                        </button>
                    </div>
                </div>
            </div>
            
            {copied && (
                <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-xl flex items-center space-x-2 animate-fade-in-up z-50">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    <span>Link copied! Don't forget your SHARE15 promo code.</span>
                </div>
            )}
        </Modal>
    );
};

export default SocialShareV2Modal;
