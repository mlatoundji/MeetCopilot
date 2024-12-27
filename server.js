import dotenv from "dotenv";
import express from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from "url";
import cors from 'cors';
// import { randomBytes } from 'crypto';
// import ffmpeg from 'fluent-ffmpeg';
// import fs from 'fs';
// import { Readable } from 'stream';
import { Blob } from 'buffer'; // Import Blob from buffer module



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


    // const fileBuffer = req.file; // Blob audio (webm) envoyé depuis le front

    // // 2. Générer des noms de fichier temporaires
    // const tmpId = randomBytes(6).toString('hex'); 
    // const inputPath = path.join('uploads', `input_${tmpId}.webm`);
    // const outputPath = path.join('uploads', `output_${tmpId}.webm`);

    // // 3. Écrire le buffer en local
    // fs.writeFileSync(inputPath, fileBuffer);

    // // 4. Lancer FFmpeg pour réécrire le conteneur (sans réencoder)
    // //    -c copy => copie directe audio
    // await new Promise((resolve, reject) => {
    //   ffmpeg(inputPath)
    //     .outputOptions(['-c copy'])  
    //     .output(outputPath)
    //     .on('end', resolve)
    //     .on('error', reject)
    //     .run();
    // });

    // // 5. Lire le fichier de sortie en buffer
    // const fixedBuffer = fs.readFileSync(outputPath);

    const formData = new FormData();
    const audioBlob = new Blob([req.file.buffer], { type: 'audio/webm' }); // Convert buffer to Blob
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'fr');

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
    const response = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        Authorization: process.env.ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_data: req.file.buffer.toString('base64'),
        language_code: 'fr',
      }),
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

// Endpoint pour suggestions basées sur GPT
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
        max_tokens: 200,
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
