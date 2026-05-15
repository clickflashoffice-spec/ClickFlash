import { GoogleGenAI, Type } from "@google/genai";
import { ShootIdea, PhotoCategory } from "../types";

const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : undefined) || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Generates creative photoshoot ideas based on location and theme.
 * Uses Gemini 2.5 Flash with structured JSON output.
 */
export async function generateShootIdeas(
  location: string,
  theme: string,
  photographerExpertise: string
): Promise<ShootIdea[]> {
  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Generate 3 creative and distinct photoshoot ideas for a '${photographerExpertise}' photographer at a '${location}' location with a '${theme}' theme.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        settings: {
                            type: Type.OBJECT,
                            properties: {
                                aperture: { type: Type.STRING },
                                shutter_speed: { type: Type.STRING },
                                iso: { type: Type.STRING },
                            },
                        },
                    },
                },
            },
        },
    });
    
    const rawText = response.text ?? '';
    return rawText ? (JSON.parse(rawText) as ShootIdea[]) : [];
  } catch (error) {
    console.error("Error generating shoot ideas with Gemini:", error);
    return [];
  }
}

/**
 * Edits an image using a text prompt.
 * Uses Gemini 2.5 Flash Image model.
 */
export async function editImageWithAI(base64Image: string, mimeType: string, prompt: string): Promise<{ data: string; mimeType: string }> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Image,
                        },
                    },
                    {
                        text: `Edit this image: ${prompt}. Return the modified image.`,
                    },
                ],
            },
        });

        const candidate = response.candidates?.[0];
        if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData) {
                    return {
                        data: part.inlineData.data ?? '',
                        mimeType: part.inlineData.mimeType || 'image/png'
                    };
                }
            }
        }
        
        throw new Error("AI response did not contain image data.");
    } catch (error) {
        console.error("Error editing image with AI:", error);
        throw new Error("Failed to edit image using Gemini API.");
    }
}

/**
 * Analyzes a set of images to suggest album metadata.
 * Uses Gemini 2.5 Flash multimodal capabilities with structured JSON output.
 */
export async function generateAlbumSuggestions(
    images: { mimeType: string; data: string }[], 
    availableCategories: string[] = ['Beach & Pool', 'Photo Session', 'Evening', 'Activities', 'Restaurant']
): Promise<{title: string, description: string, categories: PhotoCategory[], coverPhotoIndex: number}> {
    if (images.length === 0) {
        throw new Error("At least one image is required to generate album suggestions.");
    }

    try {
        // Limit to analyzing first 3 images to save tokens/bandwidth
        const imageParts = images.slice(0, 3).map(image => ({
            inlineData: { mimeType: image.mimeType, data: image.data }
        }));
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { 
                parts: [
                    ...imageParts, 
                    { 
                        text: `Analyze these images from a hotel photoshoot. Based on the visual content, suggest a creative album title, a brief friendly description for the client, and select relevant categories from this list: ${JSON.stringify(availableCategories)}. Also, suggest the index (0-indexed) of the best image to use as a cover.` 
                    }
                ] 
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        categories: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        coverPhotoIndex: { type: Type.INTEGER }
                    }
                }
            }
        });

        interface AlbumSuggestionResult {
            title?: string;
            description?: string;
            categories?: PhotoCategory[];
            coverPhotoIndex?: number;
        }
        const rawResult = response.text ?? '';
        const result: AlbumSuggestionResult | null = rawResult ? (JSON.parse(rawResult) as AlbumSuggestionResult) : null;

        // Validate index bounds
        let coverIndex = 0;
        if (result && typeof result.coverPhotoIndex === 'number') {
            if (result.coverPhotoIndex >= 0 && result.coverPhotoIndex < images.length) {
                coverIndex = result.coverPhotoIndex;
            }
        }

        return {
            title: result?.title || "New Album",
            description: result?.description || "",
            categories: result?.categories || [],
            coverPhotoIndex: coverIndex
        };

    } catch (error) {
        console.error("Error generating album suggestions with Gemini:", error);
        throw new Error("Failed to generate album suggestions.");
    }
}
