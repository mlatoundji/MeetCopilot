// stream-proxy.js
import express from 'express';
import cors from 'cors';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', async (clientSocket) => {
  console.log('Client connected to proxy');
  try {
    // Fetch temporary token from AssemblyAI (server-side)
    const resp = await fetch('https://api.assemblyai.com/v2/realtime/token?expires_in=3600', {
      method: 'POST',
      headers: { authorization: process.env.ASSEMBLYAI_API_KEY }
    });
    const { token } = await resp.json();
    console.log('Token acquired, connecting to AssemblyAI');

    // Connect to AssemblyAI WebSocket
    const assemblySocket = new WebSocket('wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000', [token]);
    assemblySocket.binaryType = 'arraybuffer';

    assemblySocket.on('open', () => {
      console.log('Proxy connected to AssemblyAI');
      clientSocket.send(JSON.stringify({ message_type: 'SessionStarted' }));
    });

    assemblySocket.on('message', (msg) => {
      // Ensure text frames remain strings (Buffer -> utf8)
      let payload = msg;
      if (Buffer.isBuffer(msg)) {
        payload = msg.toString('utf8');
      }
      clientSocket.send(payload);
    });

    assemblySocket.on('close', (code, reason) => {
      console.log(`AssemblyAI closed: ${code} ${reason}`);
      clientSocket.close(code, reason);
    });

    assemblySocket.on('error', (err) => {
      console.error('AssemblyAI socket error', err);
      clientSocket.close();
    });

    // Forward audio data from client to AssemblyAI
    clientSocket.on('message', (data) => {
      if (assemblySocket.readyState === WebSocket.OPEN) {
        assemblySocket.send(data);
      }
    });

    clientSocket.on('close', (code, reason) => {
      console.log(`Client disconnected: ${code}`);
      if (assemblySocket.readyState === WebSocket.OPEN) {
        assemblySocket.close();
      }
    });

    clientSocket.on('error', (err) => {
      console.error('Client socket error', err);
      assemblySocket.close();
    });
  } catch (err) {
    console.error('Proxy setup error', err);
    clientSocket.close(1011, 'Proxy error');
  }
});

const PORT = process.env.PORT_PROXY || 3002;
server.listen(PORT, () => console.log(`Stream proxy listening on ws://localhost:${PORT}/ws`)); 