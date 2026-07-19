export interface ImageTags {
  clothing_colors: string[];
  accessories: string[];
  context: string;
  people_count: number;
}

export async function analyzeImageWithGemini(
  imageBuffer: ArrayBuffer,
  mimeType: string,
  apiKey: string
): Promise<ImageTags> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const base64Image = btoa(
    new Uint8Array(imageBuffer)
      .reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `Analyze this image taken at a resort or attraction. 
                   Identify the prominent clothing colors (e.g., "red shirt", "blue swimsuit"). 
                   Identify any prominent accessories (e.g., "sunglasses", "hat"). 
                   Determine the context (e.g., "waterslide", "pool", "lobby"). 
                   Count the number of people.
                   Return ONLY a valid JSON object matching this schema: 
                   { "clothing_colors": [], "accessories": [], "context": "string", "people_count": 0 }`
          },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Image
            }
          }
        ]
      }
    ],
    generationConfig: {
      response_mime_type: "application/json"
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} ${errorText}`);
  }

  const data: any = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) {
    throw new Error('No text returned from Gemini');
  }

  try {
    return JSON.parse(text) as ImageTags;
  } catch (e) {
    throw new Error(`Failed to parse Gemini JSON: ${text}`);
  }
}
