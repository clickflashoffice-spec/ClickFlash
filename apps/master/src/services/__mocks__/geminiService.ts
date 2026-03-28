// Mock para geminiService.ts
// Este mock evita el problema de import.meta.env en Jest

export async function generateShootIdeas(
  _location: string,
  _theme: string,
  _photographerExpertise: string
): Promise<string[]> {
  return [];
}

export async function editImageWithAI(
  base64Image: string,
  mimeType: string,
  _prompt: string
): Promise<{ data: string; mimeType: string }> {
  return {
    data: base64Image,
    mimeType: mimeType
  };
}

export async function generateAlbumSuggestions(
  _images: { mimeType: string; data: string }[],
  _availableCategories: string[] = []
): Promise<{
  title: string;
  description: string;
  categories: string[];
  coverPhotoIndex: number;
}> {
  return {
    title: 'New Album',
    description: '',
    categories: [],
    coverPhotoIndex: 0
  };
}

