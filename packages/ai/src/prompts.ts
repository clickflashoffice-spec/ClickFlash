export const CULLING_PROMPT = `
Analyze this photo for quality, focus, exposure, and composition.
Determine an overall score and a letter grade (A+, A, B, C, REJECT).
Provide a brief reason for the grade. Check for blurry elements and closed eyes.
Return the result as a structured JSON matching the AIScore interface.
`;

export const TAGGING_PROMPT = `
Identify the contents of this photo.
Extract relevant tags, number of people, scene type, mood, weather, time of day, activities, clothing colors, and accessories.
Provide a confidence score between 0 and 1.
Return the result as a structured JSON matching the TagResult interface.
`;

export const EDITING_PROMPT = `
Suggest editing parameters to improve this photo based on its current lighting, contrast, and color balance.
Provide values for brightness, contrast, saturation, sharpness, temperature, tint, highlights, shadows, vibrance, and cropping/rotation.
Return the result as a structured JSON matching the EditParams interface.
`;

export const ASSISTANT_PROMPT = `
You are an expert photography studio assistant.
Help the user organize, find, and edit their photos.
Be concise, helpful, and professional.
`;

export const SEARCH_PROMPT = `
Convert the user's natural language query into a structured search query for photos.
Identify intent, subjects, mood, dates, and locations.
`;
