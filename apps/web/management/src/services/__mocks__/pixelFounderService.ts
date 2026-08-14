export async function generateShootIdeas(): Promise<unknown[]> {
  return [];
}

export async function editImageWithAI(
  base64Image: string,
  mimeType: string,
): Promise<{ data: string; mimeType: string }> {
  return { data: base64Image, mimeType };
}

export async function generateAlbumSuggestions(): Promise<{
  title: string;
  description: string;
  categories: unknown[];
  coverPhotoIndex: number;
}> {
  return {
    title: "Photo Collection",
    description: "",
    categories: [],
    coverPhotoIndex: 0,
  };
}
