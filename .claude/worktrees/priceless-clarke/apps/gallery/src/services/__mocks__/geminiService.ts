// Mock para geminiService.ts
// Este mock evita el problema de import.meta.env en Jest

export async function generateShootIdeas(
  location: string,
  theme: string,
  photographerExpertise: string
): Promise<any[]> {
  return [];
}

export async function editImageWithAI(
  base64Image: string,
  mimeType: string,
  prompt: string
): Promise<{ data: string; mimeType: string }> {
  return {
    data: base64Image,
    mimeType: mimeType
  };
}

export async function generateAlbumSuggestions(
  images: { mimeType: string; data: string }[],
  availableCategories: string[] = []
): Promise<{
  title: string;
  description: string;
  categories: any[];
  coverPhotoIndex: number;
}> {
  return {
    title: 'New Album',
    description: '',
    categories: [],
    coverPhotoIndex: 0
  };
}

