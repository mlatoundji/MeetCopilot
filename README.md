# Project: Real-Time Audio Transcription with AssemblyAI

This project demonstrates how to capture audio on the front end (microphone or system audio) and send it in real time to the **AssemblyAI** transcription API, all while keeping the API key secure on the server side. The application can also retrieve an *ephemeral token* to connect directly to AssemblyAI's WebSocket, or it can rely on a NodeJS proxy that relays audio to the transcription service.

## Features

1. **Audio Capture (Micro / System)**  
   - Uses the browser APIs (`getUserMedia` or `getDisplayMedia`) to capture audio.  
   - Employs an `AudioWorkletNode` to collect Float32 (16 kHz) audio samples efficiently.

2. **Real-Time Transcription**  
   - Sends audio (converted to Int16 + base64) to the **AssemblyAI** API over a WebSocket.  
   - Receives partial or final transcriptions for live display.

3. **Key Security or Proxy**  
   - **Option A**: Generate an *ephemeral token* on the server side to avoid exposing the AssemblyAI API key in the front end, then connect directly.  
   - **Option B**: Send audio chunks to a NodeJS backend, which relays them to AssemblyAI.

4. **Response Suggestions (Optional)**  
   - The NodeJS backend can call ChatGPT (or another LLM) to provide suggestions based on the transcribed conversation.

## Project Structure

```
.
├── public
│   ├── index.html            # Main page (Start/Stop buttons, transcription area, etc.)
│   ├── main.js               # Front-end logic for audio capture and WebSocket connections
│   └── recorderWorklet.js    # AudioWorkletNode script for handling raw audio buffers
├── server.js                 # NodeJS (Express) server to generate tokens / act as WS proxy / handle suggestions
├── .env                      # Environment variables (AssemblyAI key, etc.)
└── package.json
```

## Prerequisites

- **Node.js** (version >= 14)  
- **npm** or **yarn** to manage dependencies  
- An **AssemblyAI** account (with an **API Key**) for real-time transcription  
- (Optional) An **OpenAI** account if you plan to implement suggestions via ChatGPT

## Installation

1. **Clone** the repository:
   ```bash
   git clone https://github.com/your-account/your-project.git
   cd your-project
   ```

2. **Install** dependencies:
   ```bash
   npm install
   ```
   or
   ```bash
   yarn
   ```

3. **Configure** environment variables:  
   - Create a file named `.env` in the project root:
     ```bash
     ASSEMBLYAI_API_KEY=xxxxxxx
     OPENAI_API_KEY=sk-xxxxxxx
     ```
   - Make sure this file is listed in your `.gitignore`.

## Running the Project

### Method A: Start the Node server and serve the files

1. **Launch** the server:
   ```bash
   npm start
   ```
   By default, the server listens on port `3000` (or the one defined in `server.js`).

2. **Access** the application:  
   - Open your browser at [http://localhost:3000](http://localhost:3000).  
   - You should see the `index.html` page with buttons to start/stop audio capture.

### Method B: Generate an ephemeral token and connect the front end directly to AssemblyAI

1. **Start** the minimal server that returns an ephemeral token (e.g., on port 8000):
   ```bash
   node server.js
   ```
2. **In your `main.js`** (front end), do a `fetch('http://localhost:8000')` to get `{ token }`.
3. **Create** the WebSocket connection to `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}`.
4. **Send** audio packets as JSON `{ audio_data: '...' }`.

## Usage

1. **Start**: Click “Start Mic” or “Start System” to begin capturing audio.  
2. **Stop**: Click “Stop” to end capture.  
3. **Transcription**: Recognized phrases are displayed in real time in the transcription area.  
4. **Suggestions** (optional): A “Get Suggestions” button may call a `/api/suggestions` endpoint on the server side, which in turn queries ChatGPT to provide quick responses.

## Common Issues

- **“Not authorized” / Invalid token**: Make sure you’re generating an AssemblyAI token properly or have the correct API key.  
- **Garbled transcription**: Specify the correct language (`language_code=fr`, etc.) and ensure sampling (`sample_rate=16000`).  
- **WebSocket closes immediately**:
  - Inactivity or no audio chunks sent fast enough,
  - Wrong WS URL,
  - AssemblyAI plan/quota expired.

## Customization

- **Language**: Specify `language_code` in the URL or when creating the token (e.g., `fr` for French).  
- **Sample Rate**: Typically 16 kHz (`sample_rate=16000`). Adjust if you encode differently.  
- **Suggestions**: The ChatGPT code is fully modular; you can connect another LLM or your custom logic.

## License

*(Insert your chosen license here, e.g., MIT, Apache 2.0, etc.)*

## Contributors

- **Author**: *(Your Name / Username)*
- **Contributions**: Open to pull requests.

---

If you have questions or feedback, feel free to open an issue on the repository or contact the author.

**Happy developing!**