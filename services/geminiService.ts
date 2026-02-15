
import { GoogleGenAI, Type } from "@google/genai";
import { RoomAnalysis, FitScoreResult, Product } from "../types";

/**
 * Robustly converts an image URL, Data URL, or Blob URL to base64.
 * Optimized for mobile file handling and vendor-uploaded previews.
 */
export const urlToBase64 = async (url: string): Promise<string | null> => {
  if (!url) return null;
  
  // Direct handle for Data URLs
  if (url.startsWith('data:')) {
    const base64Index = url.indexOf('base64,');
    if (base64Index !== -1) {
      return url.substring(base64Index + 7);
    }
    return null;
  }
  
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64Index = result.indexOf('base64,');
        resolve(base64Index !== -1 ? result.substring(base64Index + 7) : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Error processing image for AI:", error);
    return null;
  }
};

export const analyzeRoomImage = async (base64Image: string): Promise<RoomAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';
  const cleanData = base64Image.includes('base64,') ? base64Image.split('base64,')[1] : base64Image;
  
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { inlineData: { data: cleanData, mimeType: 'image/jpeg' } },
          { text: 'Analyze this room photo. Identify its interior style, primary color palette, and room type. Suggest a vibe description for a furniture shopper. Return the results in JSON format.' }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          style: { type: Type.STRING },
          primaryColor: { type: Type.STRING },
          accentColors: { type: Type.ARRAY, items: { type: Type.STRING } },
          lighting: { type: Type.STRING },
          roomType: { type: Type.STRING },
          detectedObjects: { type: Type.ARRAY, items: { type: Type.STRING } },
          vibe: { type: Type.STRING }
        },
        required: ["style", "primaryColor", "accentColors", "lighting", "roomType", "vibe"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const generateVisualPlacement = async (
  roomBase64: string,
  productImageUrl: string,
  productName: string,
  productStyle: string,
  productDescription: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-2.5-flash-image';
  
  const cleanRoomData = roomBase64.includes('base64,') ? roomBase64.split('base64,')[1] : roomBase64;
  const productBase64 = await urlToBase64(productImageUrl);

  const parts: any[] = [
    {
      inlineData: {
        data: cleanRoomData,
        mimeType: 'image/jpeg'
      }
    }
  ];

  if (productBase64) {
    parts.push({
      inlineData: {
        data: productBase64,
        mimeType: 'image/jpeg'
      }
    });
  }

  parts.push({
    text: `FURNIVISION AI RENDERING ENGINE:
    - Target: Place the furniture item "${productName}" (Style: ${productStyle}) into the provided room background.
    - Constraints: Maintain relative scale based on the floor plane. Match the light source direction and temperature from the room. 
    - Detail: Generate contact shadows where the furniture touches the floor to create realism.
    - Style: ${productDescription}.
    - Output: Generate a single photorealistic composite image.`
  });

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts }]
  });

  if (!response.candidates?.[0]?.content?.parts) {
    throw new Error("Neural rendering engine failed. Try a different angle.");
  }

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No visual output received from AI.");
};
