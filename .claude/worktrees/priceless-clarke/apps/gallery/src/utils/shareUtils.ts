/**
 * Share Utilities
 * 
 * Helper functions for sharing photos and galleries via social media,
 * email, and copy-to-clipboard functionality.
 */

export interface ShareOptions {
    url: string;
    title?: string;
    description?: string;
    imageUrl?: string;
}

/**
 * Share to Facebook
 */
export const shareToFacebook = (options: ShareOptions): void => {
    const { url, title, description } = options;
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}${title ? `&quote=${encodeURIComponent(title)}` : ''}${description ? `&description=${encodeURIComponent(description)}` : ''}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
};

/**
 * Share to Twitter
 */
export const shareToTwitter = (options: ShareOptions): void => {
    const { url, title } = options;
    const text = title || 'Check out this photo!';
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
};

/**
 * Share to Instagram
 * Note: Instagram doesn't support direct URL sharing, so we copy the image URL
 */
export const shareToInstagram = (imageUrl: string): void => {
    // Instagram requires the app, so we copy the image URL to clipboard
    copyToClipboard(imageUrl);
    alert('Image URL copied to clipboard! Open Instagram and paste it when creating a new post.');
};

/**
 * Share to Pinterest
 */
export const shareToPinterest = (options: ShareOptions): void => {
    const { url, title, imageUrl, description } = options;
    const shareUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}${imageUrl ? `&media=${encodeURIComponent(imageUrl)}` : ''}${title ? `&description=${encodeURIComponent(title)}` : ''}${description ? `&description=${encodeURIComponent(description)}` : ''}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
};

/**
 * Share via Email
 */
export const shareViaEmail = (options: ShareOptions): void => {
    const { url, title, description } = options;
    const subject = title || 'Check out this photo gallery!';
    const body = `${description || 'I wanted to share this photo gallery with you.'}\n\n${url}`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
};

/**
 * Copy URL to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            return success;
        }
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
    }
};

/**
 * Generate shareable gallery URL
 */
export const generateShareableUrl = (galleryId: string, photoId?: string): string => {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    params.set('gallery', galleryId);
    if (photoId) {
        params.set('photo', photoId);
    }
    return `${baseUrl}?${params.toString()}`;
};

/**
 * Share photo to all platforms
 */
export const sharePhoto = (photoUrl: string, photoTitle: string, galleryUrl: string): void => {
    const options: ShareOptions = {
        url: galleryUrl,
        title: photoTitle,
        description: `Check out this photo: ${photoTitle}`,
        imageUrl: photoUrl,
    };

    // Try native Web Share API first (mobile devices)
    if (navigator.share) {
        navigator.share({
            title: photoTitle,
            text: `Check out this photo: ${photoTitle}`,
            url: galleryUrl,
        }).catch((error) => {
            console.log('Error sharing:', error);
        });
    } else {
        // Fallback: show share options
        // This will be handled by the ShareModal component
    }
};

