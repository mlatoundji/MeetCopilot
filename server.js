// server.js
// Backend NodeJS pour Google Cloud Speech-to-Text, recevant des paquets LINEAR16 (Int16) en temps réel.

import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import speech from '@google-cloud/speech';

dotenv.config();

const speechClient = new speech.SpeechClient(); // Google Cloud Speech client

const app = express();
app.use(cors());
app.use(express.static('public')); // Sert le dossier public (index.html, main.js, etc.)

// Crée un serveur HTTP
const server = http.createServer(app);

// WebSocketServer sur /transcribe
const wss = new WebSocketServer({ server, path: '/transcribe' });

// Configuration Google
function getSpeechRequestConfig() {
  return {
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000, // correspond à l'audioContext côté front
      languageCode: 'fr-FR',  // ou 'en-US' selon vos besoins
    },
    interimResults: true, // ou false si vous ne voulez que du final
  };
}

// Gestion des connexions WS
wss.on('connection', (ws) => {
  console.log('New client connected for transcription.');

  // On crée un flux streamingRecognize
  const requestConfig = getSpeechRequestConfig();
  const recognizeStream = speechClient
    .streamingRecognize(requestConfig)
    .on('error', (err) => {
      console.error('streamingRecognize error:', err);
      ws.send(JSON.stringify({ error: err.message }));
    })
    .on('data', (data) => {
      // data.results[0].alternatives[0].transcript
      if (data.results?.[0]) {
        const transcript = data.results[0].alternatives[0].transcript;
        const isFinal = data.results[0].isFinal;
        ws.send(JSON.stringify({ transcript, isFinal }));
        console.log(`Transcript (${isFinal ? 'final' : 'partial'}): ${transcript}`);
      }
    });

  // Quand on reçoit un chunk du client (Int16 encodé base64)
  ws.on('message', (message) => {
    const msg = JSON.parse(message.toString());
    if (msg.audio_data) {
      // Décoder le base64 => Buffer Int16
      const int16Buffer = Buffer.from(msg.audio_data, 'base64');
      // On envoie ce buffer (PCM brut) directement à streamingRecognize
      recognizeStream.write(int16Buffer);
    }
  });

  // Fermeture
  ws.on('close', () => {
    console.log('Client disconnected from transcription.');
    recognizeStream.end();
  });
});

// (Optionnel) Endpoint /api/suggestions
app.use(express.json());
app.post('/api/suggestions', (req, res) => {
  const { context } = req.body;
  // Logique ChatGPT ou autre
  res.json({ suggestions: ['Exemple suggestion 1', 'Exemple suggestion 2'] });
});

// Lancement serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
