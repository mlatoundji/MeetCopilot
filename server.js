import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fetch from "node-fetch";
import axios from "axios";
import cors from "cors";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Pour suggestions
const app = express();
app.use(express.json());
app.use(cors());

// app.use((req, res, next) => {
//     res.header('Access-Control-Allow-Origin', 'http://localhost:8000');
//     res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
//     next();
// });

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY || '8ea2f55dffdc4fd6a9de7115f2f00f25';
// Endpoint racine qui va récupérer un token ephemeral
app.get('/', async (req, res) => {
    try {
      // On demande à AssemblyAI un token qui expire dans 1h (3600 sec)
      const response = await axios.post(
        'https://api.assemblyai.com/v2/realtime/token',
        { expires_in: 3600 },
        { headers: { authorization: ASSEMBLYAI_API_KEY } }
      );
      // La réponse contient un objet { token: 'xyz', ... }
      const { data } = response; // data = { token, expires_at, ...}
      res.json(data);
    } catch (error) {
      console.error('Error creating ephemeral token:', error?.response?.data || error);
      const { response: { status, data } = {} } = error || {};
      res.status(status || 500).json(data || { error: 'Internal Server Error' });
    }
  });

// Servir le dossier "public"
app.use(express.static(path.join(__dirname, "public")));

// Endpoint /api/suggestions
app.post("/api/suggestions", async (req, res) => {
  try {
    const { context } = req.body;
    // Exemple : appel ChatGPT
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant providing suggestions about the conversation.",
          },
          {
            role: "user",
            content: `Conversation context: ${context}\n\nPlease provide some suggestions.`,
          },
        ],
        max_tokens: 150,
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(resp.status).send(errText);
    }
    const data = await resp.json();
    const message = data.choices?.[0]?.message?.content || "No suggestions found";
    const suggestions = message.split("\n").filter((x) => x.trim());

    return res.json({ suggestions });
  } catch (err) {
    console.error("Error in /api/suggestions:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
