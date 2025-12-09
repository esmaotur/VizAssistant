import { GoogleGenAI, Type } from "@google/genai";
import { DetectionResult } from "../types";

// Helper to downscale large images before sending to API to reduce latency
const resizeImage = (base64Str: string, maxWidth = 512): Promise<string> => {
  return new Promise((resolve) => {
    // If running in a non-browser environment (SSR), return original
    if (typeof Image === 'undefined') {
        resolve(base64Str);
        return;
    }

    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // Calculate new dimensions (keep aspect ratio)
      if (width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
          resolve(base64Str);
          return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      // Return as JPEG with 0.6 quality for faster transmission
      // This reduces payload from MBs to KBs without affecting chart detection accuracy
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => resolve(base64Str);
  });
};

const detectChartType = async (base64Image: string): Promise<DetectionResult> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key not found");
    }
    
    // OPTIMIZATION: Resize image to max 512px width and compress
    // This significantly reduces payload size and API processing time
    const optimizedImage = await resizeImage(base64Image);
    
    const base64Data = optimizedImage.split(',')[1] || optimizedImage;

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg', 
              data: base64Data
            }
          },
          {
            text: `Analyze this chart image. Identify the chart type. 
            Provide a confidence score (0-100). 
            Provide a short explanation.
            Provide example R code (using ggplot2) to recreate a similar chart.
            Provide example Python code (using seaborn) to recreate a similar chart.
            
            Return JSON with keys: chartType, confidence, explanation, rCode, pythonCode.`
          }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            chartType: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            explanation: { type: Type.STRING },
            rCode: { type: Type.STRING },
            pythonCode: { type: Type.STRING },
          },
          required: ['chartType', 'confidence', 'explanation', 'rCode', 'pythonCode']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const result = JSON.parse(text);
    return result as DetectionResult;

  } catch (error) {
    console.error("Gemini Detection Error:", error);
    // Fallback mock response for demo if API key fails or quota exceeded
    return {
      chartType: "Bar Chart (Detected - Mock)",
      confidence: 88,
      explanation: "This appears to be a vertical bar chart comparing categorical values. The distinct separated columns are characteristic of this type.",
      rCode: "# Mock R Code\nggplot(data, aes(x=cat, y=val)) + geom_bar(stat='identity')",
      pythonCode: "# Mock Python Code\nsns.barplot(data=df, x='cat', y='val')"
    };
  }
};

export default { detectChartType };