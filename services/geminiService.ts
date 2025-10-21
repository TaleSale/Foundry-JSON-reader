
import { GoogleGenAI } from "@google/genai";

export interface Journal {
  id: string;
  name: string;
  data: any;
}

export interface Actor {
  id: string;
  name: string;
  data: any;
}

export interface Item {
  id: string;
  name: string;
  data: any;
}


export async function analyzeWorld(journals: Journal[], actors: Actor[], items: Item[], question: string): Promise<string> {
  const API_KEY = process.env.API_KEY;

  if (!API_KEY) {
    throw new Error("AI features are disabled. A Google AI API key is required to use the chat.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const model = 'gemini-2.5-flash';
  
  const journalCollection = journals.map(j => ({
    fileName: j.name,
    content: j.data,
  }));

  const actorCollection = actors.map(a => ({
    fileName: a.name,
    content: a.data,
  }));
  
  const itemCollection = items.map(i => ({
    fileName: i.name,
    content: i.data,
  }));

  const jsonJournalsString = JSON.stringify(journalCollection, null, 2);
  const jsonActorsString = JSON.stringify(actorCollection, null, 2);
  const jsonItemsString = JSON.stringify(itemCollection, null, 2);

  const systemInstruction = `You are an expert assistant for Foundry Virtual Tabletop (VTT). Your task is to analyze the provided collection of JSON files, which may include journals, actor sheets, and items, that constitute a "World". Answer the user's question based ONLY on the information contained within these files. Do not make assumptions or use external knowledge. If the answer cannot be found, state that clearly. Provide a clear and concise answer in Markdown format.`;

  const userContent = `Based on the following collection of JSON files, answer my question.

**JSON Journals Content:**
\`\`\`json
${jsonJournalsString}
\`\`\`

**JSON Actors Content:**
\`\`\`json
${jsonActorsString}
\`\`\`

**JSON Items Content:**
\`\`\`json
${jsonItemsString}
\`\`\`

**User's Question:**
${question}
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: userContent,
      config: {
        systemInstruction: systemInstruction,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to get a response from the AI model.");
  }
}
