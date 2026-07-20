export interface ImageTags {
  clothing_colors: string[];
  accessories: string[];
  context: string;
  people_count: number;
  quality_score: number;
  is_blurry: boolean;
  has_closed_eyes: boolean;
  curation_status: "HIGHLIGHT" | "APPROVED" | "REJECTED";
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
                   Act as a professional photo editor. Evaluate the photo for focus/blurriness, exposure/lighting, composition, and whether subjects have closed eyes.
                   Assign a quality_score from 1 to 10.
                   Set is_blurry to true if the photo is out of focus or motion-blurred.
                   Set has_closed_eyes to true if any main subject has closed eyes.
                   Assign curation_status: "REJECTED" if blurry, heavily under/over exposed, or closed eyes; "HIGHLIGHT" if excellent lighting, sharp focus, and great composition; otherwise "APPROVED".
                   Return ONLY a valid JSON object matching this schema: 
                   { "clothing_colors": [], "accessories": [], "context": "string", "people_count": 0, "quality_score": 10, "is_blurry": false, "has_closed_eyes": false, "curation_status": "APPROVED" }`
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
