import express from 'express';
import { GoogleGenAI } from "@google/genai";
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  
  // High-level request logging
  app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    next();
  });

  app.use(express.json({ limit: '50mb' }));

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Mock credits database (in-memory for this simple demo)
  const userCredits = new Map<string, number>();

  app.post('/api/assistant', async (req, res) => {
    const { prompt, image, userId } = req.body;
    
    console.log(`Received assistant request for user: ${userId}`);
    
    if (!process.env.GEMINI_API_KEY) {
      console.error('Missing GEMINI_API_KEY');
      return res.status(500).json({ error: 'Gemini API key is missing' });
    }

    // Check credits
    const credits = userCredits.get(userId) ?? 100; // Increase default credits for testing
    if (credits <= 0) {
      return res.status(403).json({ error: 'No credits left. Please refresh or contact support.', needsCredits: true });
    }

    try {
      let parts: any[] = [{ text: prompt }];
      let hasValidImage = false;
      let imageData = "";
      let mimeType = "image/png";

      if (image) {
        if (image.startsWith('http')) {
          try {
            const fetchResponse = await fetch(image);
            if (fetchResponse.ok) {
              let contentType = fetchResponse.headers.get('content-type') || "image/png";
              // Sanitize content type: remove charset, handle multiple values
              contentType = contentType.split(';')[0].split(',')[0].trim();
              
              if (contentType.startsWith('image/')) {
                mimeType = contentType;
                const buffer = await fetchResponse.arrayBuffer();
                imageData = Buffer.from(buffer).toString('base64');
                hasValidImage = true;
              } else {
                console.warn(`Skipping non-image fetched content: ${contentType}`);
              }
            }
          } catch (e) {
            console.error("Error fetching image URL:", e);
          }
        } else if (image.includes(';base64,')) {
          // data:image/png;base64,....
          const [header, data] = image.split(';base64,');
          // Extract mime type and remove any extra parameters or doubled values
          mimeType = (header.split(':')[1] || "image/png").split(';')[0].split(',')[0].trim();
          imageData = data;
          hasValidImage = true;
        } else if (image.includes(',')) {
          imageData = image.split(',')[1];
          hasValidImage = true;
        } else {
          imageData = image;
          hasValidImage = true;
        }

        if (hasValidImage && imageData) {
          parts = [
            {
              inlineData: {
                mimeType: mimeType || "image/png",
                data: imageData,
              },
            },
            ...parts
          ];
        }
      }

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest", 
        contents: { parts },
        config: {
          systemInstruction: `You are the core AI engine for 'My Assistant' mobile app in India.
Your job is to help non-tech-savvy users navigate complex websites, government portals, apps, and settings.
Instructions:
1. Analyze the provided screenshot immediately.
2. Identify UI elements (buttons, menus, forms).
3. Provide EXTREMELY SIMPLE, direct, step-by-step instructions.
4. Use clear bullet points.
5. Keep it short for a mobile chat box.
6. Referral to UI elements like 'Click the yellow button' or 'Tap three dots on top right'.
7. Do not use technical jargon.`,
        },
      });

      console.log(`Gemini response received. Text length: ${response.text?.length || 0}`);
      
      // Deduct credit
      userCredits.set(userId, credits - 1);

      res.json({ 
        text: response.text || "I'm sorry, I couldn't generate a response. Please try again.", 
        creditsLeft: credits - 1 
      });
    } catch (error: any) {
      console.error('Gemini Error Details:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        status: error.status
      });
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  app.post('/api/earn-credits', (req, res) => {
    const { userId } = req.body;
    const currentCredits = userCredits.get(userId) ?? 0;
    userCredits.set(userId, currentCredits + 5);
    res.json({ credits: currentCredits + 5 });
  });

  app.get('/api/credits/:userId', (req, res) => {
    const { userId } = req.params;
    const credits = userCredits.get(userId as string) ?? 5;
    res.json({ credits });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
