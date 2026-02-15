
import { GoogleGenAI, Type } from "@google/genai";
import { RoomAnalysis } from "../types";

export const urlToBase64 = async (url: string): Promise<string | null> => {
  if (!url) return null;
  if (url.startsWith('data:')) {
    const base64Index = url.indexOf('base64,');
    return base64Index !== -1 ? url.substring(base64Index + 7) : null;
  }
  try {
    const response = await fetch(url);
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
  const cleanData = base64Image.includes('base64,') ? base64Image.split('base64,')[1] : base64Image;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          { inlineData: { data: cleanData, mimeType: 'image/jpeg' } },
          { text: 'Analyze this room photo for furniture placement compatibility. Provide a detailed stylistic and spatial profile. Output MUST be valid JSON.' }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          style: { type: Type.STRING, description: 'The architectural or interior design style of the room.' },
          primaryColor: { type: Type.STRING, description: 'The dominant color of the room.' },
          accentColors: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Supporting accent colors found in the room.' },
          lighting: { type: Type.STRING, description: 'Description of the lighting conditions (e.g., Natural Bright, Dim Ambient).' },
          roomType: { type: Type.STRING, description: 'The type of room (e.g., Living Room, Bedroom).' },
          detectedObjects: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Existing furniture or decor items detected.' },
          vibe: { type: Type.STRING, description: 'A short, creative description of the room atmosphere.' }
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
  const cleanRoomData = roomBase64.includes('base64,') ? roomBase64.split('base64,')[1] : roomBase64;
  const productBase64 = await urlToBase64(productImageUrl);

  const parts: any[] = [{ inlineData: { data: cleanRoomData, mimeType: 'image/jpeg' } }];
  if (productBase64) {
    parts.push({ inlineData: { data: productBase64, mimeType: 'image/jpeg' } });
  }

  parts.push({
    text: `SPATIAL RENDERING TASK: Please place the furniture piece "${productName}" into the provided room photo.
    - Style: ${productStyle}
    - Description: ${productDescription}
    - Technical Requirements: Match the room's lighting intensity and direction. Ensure the piece is at a realistic scale relative to the room's geometry. Add soft grounding shadows where the legs touch the floor.`
  });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{ parts }]
  });

  const imgPart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (!imgPart?.inlineData) throw new Error("Neural rendering failed. Please try a clearer room photo.");
  return `data:image/png;base64,${imgPart.inlineData.data}`;
};
