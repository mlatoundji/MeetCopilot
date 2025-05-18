// token-server.js
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());

// Endpoint to fetch AssemblyAI realtime token
app.post('/token', async (req, res) => {
  try {
    const resp = await fetch('https://api.assemblyai.com/v2/realtime/token?expires_in=3600', {
      method: 'POST',
      headers: { authorization: process.env.ASSEMBLYAI_API_KEY }
    });
    const data = await resp.json();
    return res.json({ token: data.token });
  } catch (err) {
    console.error('Token proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Token proxy listening on http://localhost:${PORT}`);
}); 