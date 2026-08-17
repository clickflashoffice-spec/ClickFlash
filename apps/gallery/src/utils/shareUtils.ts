export interface ShareOptions {
  url: string;
  title?: string;
  text?: string;
  media?: string;
  description?: string;
  imageUrl?: string;
}

export function generateShareableUrl(galleryId: string, photoId?: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://gallery.clickflash.com';
  if (photoId) {
    return `${base}/gallery/${galleryId}?photo=${photoId}`;
  }
  return `${base}/gallery/${galleryId}`;
}

export function shareToFacebook(optionsOrUrl: ShareOptions | string, title?: string): void {
  const url = typeof optionsOrUrl === 'string' ? optionsOrUrl : optionsOrUrl.url;
  const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  window.open(shareUrl, '_blank', 'width=600,height=400');
}

export function shareToTwitter(optionsOrUrl: ShareOptions | string, text?: string): void {
  const url = typeof optionsOrUrl === 'string' ? optionsOrUrl : optionsOrUrl.url;
  const tweetText = typeof optionsOrUrl === 'string' ? text : (optionsOrUrl.text || optionsOrUrl.title);
  const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(tweetText || 'Check out my vacation memories on ClickFlash!')}`;
  window.open(shareUrl, '_blank', 'width=600,height=400');
}

export function shareToPinterest(optionsOrUrl: ShareOptions | string, mediaOrDesc?: string, description?: string): void {
  let url: string;
  let media: string;
  let desc: string;

  if (typeof optionsOrUrl === 'string') {
    url = optionsOrUrl;
    media = mediaOrDesc || '';
    desc = description || '';
  } else {
    url = optionsOrUrl.url;
    media = optionsOrUrl.media || optionsOrUrl.imageUrl || '';
    desc = optionsOrUrl.description || optionsOrUrl.title || '';
  }

  const shareUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&media=${encodeURIComponent(media)}&description=${encodeURIComponent(desc || 'ClickFlash Resort Photography')}`;
  window.open(shareUrl, '_blank', 'width=750,height=500');
}

export function shareViaEmail(optionsOrUrl: ShareOptions | string, subject?: string, body?: string): void {
  let url: string;
  let sub: string;
  let bod: string;

  if (typeof optionsOrUrl === 'string') {
    url = optionsOrUrl;
    sub = subject || 'Vacation Photos';
    bod = body || 'Check out my photos:';
  } else {
    url = optionsOrUrl.url;
    sub = optionsOrUrl.title || 'Vacation Photos';
    bod = optionsOrUrl.description || 'Check out my vacation photos:';
  }

  const mailtoUrl = `mailto:?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(`${bod}\n\n${url}`)}`;
  window.location.href = mailtoUrl;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
}
