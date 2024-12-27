// server.js
// Exemple de backend NodeJS pour Google Cloud Speech-to-Text, conversion Opus->PCM via sox

import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import { spawn } from "child_process";
import { v4 as uuidv4 } from "uuid";
import speech from "@google-cloud/speech";
import ffmpeg from "fluent-ffmpeg";
import stream from "stream";


dotenv.config();



const speechClient = new speech.SpeechClient(); // Google Cloud Speech client
const app = express();
app.use(cors());
app.use(express.static('public')); // Sert le dossier public

// Crée un serveur HTTP
const server = http.createServer(app);

// WebSocketServer sur /transcribe
const wss = new WebSocketServer({ server, path: "/transcribe" });

// Configuration Google
function getSpeechRequestConfig() {
  return {
    config: {
      encoding: 'LINEAR16',       // On va fournir du PCM brut
      sampleRateHertz: 16000,     // sox sortira du 16 kHz
      languageCode: 'fr-FR',      // À adapter (ex: 'en-US', 'fr-FR')
    },
    interimResults: false          // Reçoit des résultats partiels
  };
}

// Gestion des connexions WS
wss.on("connection", (ws) => {
  console.log("New client connected for transcription.");

  // 1) On spawn sox pour conversion Opus -> PCM
  //    -t opus => Type entrée opus
  //    - => stdin
  //    -t raw => sortie en format brut
  //    -r 16000 => sample rate 16k
  //    -e signed-integer -b 16 => PCM 16 bits
  //    -c 1 => mono
  //    - => stdout
  // const sox = spawn("sox", [
  //   "-t", "wav",
  //   "-",
  //   "-t", "raw",
  //   "-r", "16000",
  //   "-e", "signed-integer",
  //   "-b", "16",
  //   "-c", "1",
  //   "-"
  // ]);

  // let soxClosed = false;

  // sox.on("error", (err) => {
  //   console.error("Sox error:", err);
  //   ws.send(JSON.stringify({ error: `Sox error: ${err.message}` }));
  //   soxClosed = true;
  // });

  // sox.on("close", (code, signal) => {
  //   console.log(`Sox process closed with code ${code} and signal ${signal}`);
  //   soxClosed = true;
  // });

  // // sox.on("error", (err) => {
  // //   console.error("Sox error:", err);
  // //   ws.send(JSON.stringify({ error: `Sox error: ${err.message}` }));
  // // });

  // sox.stderr.on("data", (data) => {
  //   console.error(`Sox stderr: ${data}`);
  // });

  // sox.stdout.on("data", (data) => {
  //   console.log("Sox output data size:", data.length);
  // });

  // 2) On crée le flux streamingRecognize
  const requestConfig = getSpeechRequestConfig();
  const recognizeStream = speechClient
    .streamingRecognize(requestConfig)
    .on("error", (err) => {
      console.error("streamingRecognize error:", err);
      ws.send(JSON.stringify({ error: err.message }));
    })
    .on("data", (data) => {
      console.log("DATA RECEIVED:", data);
      // data.results[0].alternatives[0].transcript
      if (data.results?.[0]) {
        const transcript = data.results[0].alternatives[0].transcript;
        const isFinal = data.results[0].isFinal;
        ws.send(JSON.stringify({ transcript, isFinal }));
        console.log(`Transcript (${isFinal ? 'final' : 'partial'}): ${transcript}`);
      }
    });

    recognizeStream.on("data", (data) => {
      console.log("RecognizeStream data size:", data.length);
    });

  // La sortie de sox (PCM) => google streaming
  // sox.stdout.pipe(recognizeStream);
  // let audioChunks = [];

  // let isFirstChunk = true;

  // Quand on reçoit un chunk du client
  ws.on("message", (message) => {
    console.log("Message received from client");

    const msg = JSON.parse(message.toString());
    if (msg.audio_data) {
      const webmBuffer = Buffer.from(msg.audio_data, 'base64');
      console.log("WebM buffer size:", webmBuffer.length);
      // if (isFirstChunk) {
        // On envoie la config Google Speech-to-Text
      //   isFirstChunk = false;
      // }
      // else {
      //   audioChunks.pop();
      // }

      // audioChunks.push(webmBuffer);
      // const completeBuffer = Buffer.concat(audioChunks);


      // Convertir WebM en WAV
      const webmStream = new stream.PassThrough();
      webmStream.end(webmBuffer);

      const wavStream = new stream.PassThrough();

      ffmpeg(webmStream)
        .toFormat('wav')
        .audioFrequency(16000)
        .audioChannels(1)
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          ws.send(JSON.stringify({ error: `FFmpeg error: ${err.message}` }));
        })
        .on('end', () => {
          console.log('FFmpeg conversion finished');
        })
        .pipe(wavStream);

      // La sortie de ffmpeg (WAV) => google streaming
      wavStream.pipe(recognizeStream /*, { end: false }*/);


    //   // Décoder le base64
    //   const opusBuffer = Buffer.from(msg.audio_data, 'base64');
    //   // Écrire dans sox.stdin
    //   // sox.stdin.write(opusBuffer);
    //   if (!soxClosed) {

    //   sox.stdin.write(opusBuffer, (err) => {
    //     if (err) {
    //       console.error("Error writing to sox.stdin:", err);
    //     } else {
    //       console.log("Data written to sox.stdin");
    //     }
    //   });
    // } else {
    //   console.error("Cannot write to sox.stdin: stream is closed");
    // }
    }
    }  
  );

  // Fermeture
  ws.on("close", () => {
    console.log("Client disconnected from transcription.");
    // On arrête sox, streamingRecognize
    // sox.stdin.end();      // Fin du flux
    recognizeStream.end();
  });

});

// (Optionnel) Endpoint /api/suggestions
app.use(express.json());
app.post("/api/suggestions", (req, res) => {
  const { context } = req.body;
  // Logique ChatGPT ou autre
  res.json({ suggestions: ["Exemple 1", "Exemple 2"] });
});

// Lancement serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
