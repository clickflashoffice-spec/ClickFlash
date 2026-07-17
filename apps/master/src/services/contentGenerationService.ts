export interface GalleryMetadata {
    eventName: string;
    date: string;
    location: string;
    tags: string[];
    highlightImageCount: number;
}

export interface GeneratedContent {
    blogPostHtml: string;
    emailSubject: string;
    emailBodyText: string;
}

const safeText = (value: unknown, fallback: string): string => {
    if (typeof value !== "string") return fallback;
    const normalized = value.trim().replace(/\s+/g, " ").slice(0, 160);
    return normalized || fallback;
};

const escapeHtml = (value: string): string => value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const safeCount = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
};

/** Builds reviewable gallery copy locally from supplied metadata. */
export class ContentGenerationService {
    async generateGalleryContent(metadata: GalleryMetadata): Promise<GeneratedContent> {
        const eventName = safeText(metadata.eventName, "Photo Session");
        const location = safeText(metadata.location, "the selected location");
        const date = safeText(metadata.date, "the session date");
        const highlightImageCount = safeCount(metadata.highlightImageCount);
        const tags = Array.isArray(metadata.tags)
            ? metadata.tags
                .map((tag) => safeText(tag, ""))
                .filter((tag, index, all) => tag && all.indexOf(tag) === index)
                .slice(0, 8)
            : [];

        const escapedEvent = escapeHtml(eventName);
        const escapedLocation = escapeHtml(location);
        const escapedDate = escapeHtml(date);
        const escapedTags = tags.map(escapeHtml).join(", ");
        const imageLabel = `${highlightImageCount} highlighted image${highlightImageCount === 1 ? "" : "s"}`;
        const tagSentence = escapedTags
            ? `The collection focuses on ${escapedTags}.`
            : "The collection presents the strongest moments selected by the studio.";

        const content: GeneratedContent = {
            blogPostHtml: `<h1>${escapedEvent} photography at ${escapedLocation}</h1><p>Captured on ${escapedDate}, this gallery brings together ${imageLabel} from the session.</p><p>${tagSentence} Every image was selected for a clear, consistent client story.</p>`,
            emailSubject: `${eventName} gallery is ready`,
            emailBodyText: `Your ${eventName} gallery from ${date} at ${location} is ready to view. It includes ${imageLabel}. Please review your favorites when convenient.`,
        };

        return content;
    }
}

export default new ContentGenerationService();
