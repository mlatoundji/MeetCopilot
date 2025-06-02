# Virtual Meeting Assistant

This application serves as a **virtual assistant** to:

- **Capture audio** (microphone or system/tab) for a live meeting or a long interview session.  
- **Transcribe** that audio in real time via Whisper or AssemblyAI.  
- **Generate summaries** every **X** minutes, providing a concise overview of what was said.  
- **Suggest replies** or responses through ChatGPT/GPT-4, based on the conversation context and the previously saved summaries.

## Features

1. **System Audio Capture**: Allows selecting a browser tab or window, with the option to share audio.  
2. **Microphone Capture**: Records local microphone input.  
3. **Real-Time Transcription**:  
   - **Whisper**: via OpenAI's \(`/transcribe/whisper`\) endpoint, or  
   - **AssemblyAI**: via \(`/transcribe/assemblyai`\).  
4. **Summaries**:  
   - Generates or requests a summary every **X** minutes to keep the conversation streamlined.  
   - Stores these summaries to reconstitute context over time.  
5. **Reply Suggestions**:  
   - Provides 3 bullet-point suggestions for how to respond, taking into account the latest question and conversation context.  

## Prerequisites  
- Node.js (version 14 or higher)  
- Python (optional, for serving the frontend locally)  
- API keys for OpenAI (Whisper) and/or AssemblyAI

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Create a `.env` file**:
   ```bash
   OPENAI_API_KEY=sk-xxxxxxx
   ASSEMBLYAI_API_KEY=xxxxxxxx
   PORT=XXXX
   ```
   
3. **Run the server**:
   ```bash
   npm start
   ```
   The Node.js server will start at port 3000 by default.

## Usage

1. **Front-End**:  
   If you wish to serve the front-end on port 8000 instead, you can run:
   ```bash
   python -m http.server 8000
   ```
   Or

   ```bash
   npx http-server public -p 8000
   ```
   Then open [http://localhost:8000](http://localhost:8000) in your browser.
2. **Capturing Audio**:  
   - *System Capture*: Click **"Start System Capture"** to record an active tab/window.  
   - *Microphone*: Click **"Start Mic"** to record locally from the mic.
3. **Transcription**: View recognized text on-screen (e.g., the transcription panel).  
4. **Generate Summaries**: The system periodically creates short summaries (e.g., every 15 minutes) to condense conversation segments.  
5. **Suggestions**: Click **"Generate Suggestions"** to get 3 response ideas from ChatGPT/GPT-4.

![alt text](https://github.com/MMyster/MeetCopilot/blob/develop/img/test.png?raw=true)

## Testing the Application

You can test the application's endpoints using either `curl` or PowerShell's `Invoke-WebRequest` commands:

### Using PowerShell
```powershell
# Test local suggestions endpoint
Invoke-WebRequest -Uri "http://localhost:3000/api/suggestions/local" -Method Post -ContentType "application/json" -Body '{"context": "Votre texte ici"}'

# Test transcription endpoint (Whisper)
Invoke-WebRequest -Uri "http://localhost:3000/api/transcribe/whisper" -Method Post -ContentType "application/json" -Body '{"audio": "base64_encoded_audio_data"}'

# Test transcription endpoint (AssemblyAI)
Invoke-WebRequest -Uri "http://localhost:3000/api/transcribe/assemblyai" -Method Post -ContentType "application/json" -Body '{"audio": "base64_encoded_audio_data"}'

# Test summary generation
Invoke-WebRequest -Uri "http://localhost:3000/api/summary" -Method Post -ContentType "application/json" -Body '{"text": "Your long text here"}'
```

### Using curl
```bash
# Test local suggestions endpoint
curl -X POST -H "Content-Type: application/json" -d '{"context": "Votre texte ici"}' http://localhost:3000/api/suggestions/local

# Test transcription endpoint (Whisper)
curl -X POST -H "Content-Type: application/json" -d '{"audio": "base64_encoded_audio_data"}' http://localhost:3000/api/transcribe/whisper

# Test transcription endpoint (AssemblyAI)
curl -X POST -H "Content-Type: application/json" -d '{"audio": "base64_encoded_audio_data"}' http://localhost:3000/api/transcribe/assemblyai

# Test summary generation
curl -X POST -H "Content-Type: application/json" -d '{"text": "Your long text here"}' http://localhost:3000/api/summary
```

Note: Replace `base64_encoded_audio_data` with actual base64-encoded audio data when testing transcription endpoints.

## Contributions

- **Author**: MMyster 
- **Contributions**: Open to pull requests.  

## Keyboard Shortcuts / Raccourcis clavier

Below are the default keyboard shortcuts available on the meeting page:

| Win/Linux          | macOS              | Action / Action (FR)                                           |
|--------------------|--------------------|----------------------------------------------------------------|
| Ctrl + Alt + S     | ⌘ + Option + S     | Start/Stop System Capture / Démarrer/Arrêter capture système   |
| Ctrl + Alt + M     | ⌘ + Option + M     | Start/Stop Mic Capture / Démarrer/Arrêter capture micro        |
| Ctrl + Alt + I     | ⌘ + Option + I     | Capture Image / Capture d'écran                                |
| Ctrl + Alt + G     | ⌘ + Option + G     | Generate Suggestions / Générer des suggestions                 |
| Ctrl + Alt + E     | ⌘ + Option + E     | Save & Quit Meeting / Sauvegarder et quitter la réunion        |
| Ctrl + Alt + Q     | ⌘ + Option + Q     | Quit Meeting / Quitter la réunion                             |
| Ctrl + Alt + B     | ⌘ + Option + B     | Toggle Sidebar / Afficher/Cacher la meeting-sidebar            |
| Ctrl + Alt + F     | ⌘ + Option + F     | Toggle Full Sidebar / Basculer en sidebar "plein"              |
| Ctrl + Alt + P     | ⌘ + Option + P     | Open/Close Layout Presets Panel / Ouvrir/Fermer les presets    |
| Ctrl + Alt + T     | ⌘ + Option + T     | Toggle Transcription Area / Afficher/Cacher la transcription   |
| Ctrl + Alt + U     | ⌘ + Option + U     | Toggle Suggestions Area / Afficher/Cacher les suggestions      |
