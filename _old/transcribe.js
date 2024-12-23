import express from 'express';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { randomBytes } from 'crypto';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const upload = multer();

const uploadsDir = path.join(process.cwd(), 'uploads');

// Vérifier si le dossier existe, sinon le créer
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:8000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  next();
});

app.get("/", (req, res) => {
    res.send("API Transcribe !");
});

// Endpoint /api/transcribe
app.post('/api/transcribe', upload.single('file'), async (req, res) => {
  try {
    // 1. Récupérer le buffer du fichier reçu
    const fileBuffer = req.file.buffer; // Blob audio (webm) envoyé depuis le front

    // 2. Générer des noms de fichier temporaires
    const tmpId = randomBytes(6).toString('hex'); 
    const inputPath = path.join('uploads', `input_${tmpId}.webm`);
    const outputPath = path.join('uploads', `output_${tmpId}.webm`);

    // 3. Écrire le buffer en local
    fs.writeFileSync(inputPath, fileBuffer);

    // 4. Lancer FFmpeg pour réécrire le conteneur (sans réencoder)
    //    -c copy => copie directe audio
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions(['-c copy'])  
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    // 5. Lire le fichier de sortie en buffer
    const fixedBuffer = fs.readFileSync(outputPath);

    // 6. Construire le FormData pour Whisper
    const formData = new FormData();
    formData.append('file', fixedBuffer, 'audio.webm');
    formData.append('model', 'whisper-1');

    // 7. Envoyer à OpenAI
    const openaiResp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        // On ne met pas 'Content-Type': 'multipart/form-data', c'est FormData qui s'en occupe
      },
      body: formData
    });

    if (!openaiResp.ok) {
      const errorText = await openaiResp.text();
      console.error('OpenAI error:', openaiResp.status, errorText);
      return res.status(openaiResp.status).send(errorText);
    }

    const data = await openaiResp.json();

    // 8. Nettoyer les fichiers temporaires (optionnel)
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    // 9. Renvoyer la réponse finale (transcription) au front-end
    return res.json(data);
  } catch (err) {
    console.error('Error /api/transcribe:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Lancement du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
