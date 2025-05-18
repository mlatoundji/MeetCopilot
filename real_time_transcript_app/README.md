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