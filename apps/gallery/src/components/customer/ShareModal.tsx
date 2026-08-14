import { Modal } from '@clickflash/ui';
import React, { useState } from 'react';

import { Photo } from '../../types';
import UpsellEngine from './UpsellEngine';
import { 
    shareToFacebook, 
    shareToTwitter, 
    shareToPinterest, 
    shareViaEmail, 
    copyToClipboard,
    generateShareableUrl,
    ShareOptions
} from '../../utils/shareUtils';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    photo?: Photo;
    galleryId: string;
    galleryTitle?: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, photo, galleryId, galleryTitle }) => {
    const [copied, setCopied] = useState(false);
    const [emailAddress, setEmailAddress] = useState('');
    
    const shareUrl = generateShareableUrl(galleryId, photo?.id);
    const shareTitle = photo ? photo.title : (galleryTitle || 'Photo Gallery');
    const shareImageUrl = photo?.url || '';
    
    const shareOptions: ShareOptions = {
        url: shareUrl,
        title: shareTitle,
        description: `Check out ${photo ? 'this photo' : 'this photo gallery'}: ${shareTitle}`,
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
    
    const handleEmailShare = () => {
        unlockDiscount();
        if (emailAddress) {
            shareViaEmail({
                ...shareOptions,
                url: `${shareUrl}&email=${encodeURIComponent(emailAddress)}`,
            });
        } else {
            shareViaEmail(shareOptions);
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Share" size="md">
            <div className="space-y-6">
                {/* Upsell Reward Engine Banner */}
                <UpsellEngine galleryId={galleryId} photoId={photo?.id} />

                {/* Social Media Buttons */}
                <div>
                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">
                        Share on Social Media
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => { unlockDiscount(); shareToFacebook(shareOptions); }}
                            className="flex items-center justify-center space-x-2 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                            <span>Facebook</span>
                        </button>
                        
                        <button
                            onClick={() => { unlockDiscount(); shareToTwitter(shareOptions); }}
                            className="flex items-center justify-center space-x-2 p-3 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                            </svg>
                            <span>Twitter</span>
                        </button>
                        
                        <button
                            onClick={() => { unlockDiscount(); shareToPinterest(shareOptions); }}
                            className="flex items-center justify-center space-x-2 p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
                            </svg>
                            <span>Pinterest</span>
                        </button>
                        
                        <button
                            onClick={handleEmailShare}
                            className="flex items-center justify-center space-x-2 p-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span>Email</span>
                        </button>
                    </div>
                </div>
                
                {/* Copy Link */}
                <div>
                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">
                        Copy Link
                    </h3>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={shareUrl}
                            readOnly
                            className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                        />
                        <button
                            onClick={handleCopyLink}
                            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                                copied
                                    ? 'bg-green-600 text-white'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                        >
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>
                
                {/* Email Input (Optional) */}
                <div>
                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">
                        Or Enter Email Address
                    </h3>
                    <div className="flex space-x-2">
                        <input
                            type="email"
                            value={emailAddress}
                            onChange={(e) => setEmailAddress(e.target.value)}
                            placeholder="email@example.com"
                            className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <button
                            onClick={handleEmailShare}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ShareModal;

