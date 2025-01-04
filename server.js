import dotenv from "dotenv";
import express from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from "url";
import cors from 'cors';
import { Blob } from 'buffer';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

// Configurer Multer pour gérer les fichiers audio uploadés
const upload = multer({
  storage: multer.memoryStorage(),
});

// Middleware JSON
app.use(express.json());

// Endpoint pour transcription via Whisper
app.post('/transcribe/whisper', upload.single('audio'), async (req, res) => {
  try {

    const mimeType = req.file.mimetype?? 'audio/wav';
    const filename = req.file.fileName?? 'audio.wav';
    const model = req.body.model?? 'whisper-1';
    const language = req.body.langCode?? 'fr';

    const formData = new FormData();
    const audioBlob = new Blob([req.file.buffer], { type: mimeType }); // Convert buffer to Blob
    formData.append('file', audioBlob, filename);
    formData.append('model', model);
    formData.append('language', language);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    res.json({ transcription: data.text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint pour transcription via AssemblyAI
app.post('/transcribe/assemblyai', upload.single('audio'), async (req, res) => {
  try {
    console.log("Language code : "+ req.body.langCode);
    const uploadResp = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization' : process.env.ASSEMBLYAI_API_KEY,
      },
      body: req.file.buffer,
    });

    const uploadData = await uploadResp.json();
    if (!uploadResp.ok) { 
      return res.status(uploadResp.status).json({ error: uploadData });
    }
    const uploadUrl = uploadData.upload_url;

    const transcriptResp = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        "Authorization": process.env.ASSEMBLYAI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        audio_url: uploadUrl,
        language_code: req.body.langCode
      })
    });

    const transcript = await transcriptResp.json();
    const transcriptId = transcript.id;

    let completed = false;
  while (!completed) {
  await new Promise(r => setTimeout(r, 300));

  const pollResp = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
    headers: { "Authorization": process.env.ASSEMBLYAI_API_KEY }
  });
  const pollData = await pollResp.json();

  if (pollData.status === "completed") {
    console.log("Transcription:", pollData.text);
    completed = true;
    res.status(pollResp.status).json({ transcription: pollData.text });
  } else if (pollData.status === "error") {
    console.error("Transcription error:", pollData.error);
    completed = true;
    res.status(pollResp.status).json({ error: pollData.error});

  } else {
    console.log("Transcription status:", pollData.status);
  }

  }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint pour suggestions basées sur GPT
app.post('/summary', async (req, res) => {
  try {
    const systemPrompt = `
  Tu es un assistant IA chargé de résumer un segment de conversation. 
  Le résumé doit être concis (100-200 mots max) et mettre en avant les points clés et éventuellement la dernière question posée par l'interlocuteur [SystemAudio]. 
  Tes réponses doivent être claires et précises et se concentrer sur les informations les plus importantes.
  Voici le format de la réponse attendue :
  - Points clés : ...
  - Dernière question : ...
  `;
    const { context } = req.body;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: context },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    res.json({ summary: data.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/suggestions', async (req, res) => {
  try {
    const systemPrompt = `
    Vous êtes un assistant IA spécialisé dans la synthèse et la génération de
    suggestions de réponses d'utilisateurs dans une conversation.
    Fournissez 3 suggestions de réponses potentielles sous forme de liste à puces à la dernière question détectée.
    Basez vos suggestions sur le contexte ci-dessous :
  `;
    const { context } = req.body;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: context },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    res.json({ suggestions: data.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir les fichiers statiques pour le front-end
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
