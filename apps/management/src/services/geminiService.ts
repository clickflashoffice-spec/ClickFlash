import { GoogleGenerativeAI } from "@google/generative-ai";
import { ShootIdea, PhotoCategory } from "../types.ts";

const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Generates creative photoshoot ideas based on location and theme.
 */
export async function generateShootIdeas(
  location: string,
  theme: string,
  photographerExpertise: string,
): Promise<ShootIdea[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Generate 3 creative photoshoot ideas for a '${photographerExpertise}' photographer at a '${location}' location with a '${theme}' theme. Return as JSON array of objects with title, description, and settings (aperture, shutter_speed, iso).`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Simple JSON extraction to be safe
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch (error) {
    console.error("Error generating shoot ideas with Gemini:", error);
    return [];
  }
}

/**
 * Edits an image using a text prompt.
 */
export async function editImageWithAI(
  base64Image: string,
  mimeType: string,
  prompt: string,
): Promise<{ data: string; mimeType: string }> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image,
        },
      },
      {
        text: `Edit this image: ${prompt}. Return the modified image.`,
      },
    ]);

    const response = await result.response;
    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return {
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType || "image/png",
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
 */
export async function generateAlbumSuggestions(
  images: { mimeType: string; data: string }[],
  availableCategories: string[] = [
    "Beach & Pool",
    "Photo Session",
    "Evening",
    "Activities",
    "Restaurant",
  ],
): Promise<{
  title: string;
  description: string;
  categories: PhotoCategory[];
  coverPhotoIndex: number;
}> {
  if (images.length === 0) {
    throw new Error("At least one image is required to generate album suggestions.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const imageParts = images.slice(0, 3).map((image) => ({
      inlineData: { mimeType: image.mimeType, data: image.data },
    }));

    const prompt = `Analyze these images. Suggest a creative album title, a brief description, and relevant categories from: ${JSON.stringify(availableCategories)}. Also suggest the index (0-indexed) of the best cover image. Return as JSON object: {title, description, categories, coverPhotoIndex}.`;

    const result = await model.generateContent([...imageParts, prompt]);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return {
      title: data?.title || "New Album",
      description: data?.description || "",
      categories: data?.categories || [],
      coverPhotoIndex: data?.coverPhotoIndex || 0,
    };
  } catch (error) {
    console.error("Error generating album suggestions with Gemini:", error);
    throw new Error("Failed to generate album suggestions.");
  }
}

/**
 * Generates an end-of-week/month revenue forecast.
 */
export async function generateSalesForecast(metrics: any): Promise<{
  end_of_week_revenue: number;
  end_of_month_revenue: number;
  insights: string[];
}> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Based on these sales metrics: ${JSON.stringify(metrics)}. Provide a financial forecast and 3 insights. Return as JSON: {end_of_week_revenue, end_of_month_revenue, insights}.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return {
      end_of_week_revenue: data?.end_of_week_revenue || 0,
      end_of_month_revenue: data?.end_of_month_revenue || 0,
      insights: data?.insights || ["Not enough data."],
    };
  } catch (error) {
    console.error("Error generating sales forecast with Gemini:", error);
    throw new Error("Failed to generate sales forecast.");
  }
}
