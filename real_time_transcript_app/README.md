# Real-Time Transcript POC

This is a minimal proof-of-concept app that captures microphone audio, detects silences, and logs utterance boundaries and RMS values.

## Usage

1. Serve this directory over HTTP (required for microphone access), e.g.:

   ```bash
   npx serve .
   ```

2. Open http://localhost:5000 (or the port printed) in your browser.

3. Click "Start" to begin streaming audio.
4. Click "Stop" to end streaming.

Check the console and on-page log for RMS values and utterance start/end notifications.

## Streaming Proxy Setup

To enable real-time transcription via AssemblyAI without CORS issues, we use a local WebSocket proxy that handles token generation and forwards audio:

1. Install dependencies:
   ```bash
   npm install ws express cors node-fetch dotenv
   ```
2. Ensure your `.env` contains:
   ```env
   ASSEMBLYAI_API_KEY=your_real_key_here
   ```
3. Start the proxy server:
   ```bash
   node stream-proxy.js
   ```
4. In another terminal, serve the client app:
   ```bash
   npx serve .
   ```
5. Open the served URL in your browser and click "Start Streaming". Transcription should now stream through the proxy. 