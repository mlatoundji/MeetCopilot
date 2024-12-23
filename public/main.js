// main.js (Front-end)
const SERVER_API_URL = "http://localhost:3000"; 
const SERVER_API_URL_SUGGESTIONS = SERVER_API_URL + "/api/suggestions"; 


const response = await fetch(SERVER_API_URL); 
const data = await response.json();
    
if (data.error) {
    alert(data.error);
}

const { token } = data; // ephemeral token


let audioContext = null;
let workletNode = null;
let currentStream = null;

let assemblyAIWS = null;   // WebSocket vers AssemblyAI
let conversationContext = ""; // Accumule le texte transcrit

const startMicBtn = document.getElementById("startMicBtn");
const stopMicBtn = document.getElementById("stopMicBtn");
const startSystemBtn = document.getElementById("startSystemBtn");
const stopSystemBtn = document.getElementById("stopSystemBtn");
const requestSuggestionBtn = document.getElementById("requestSuggestionBtn");

const transcriptionDiv = document.getElementById("transcription");
const suggestionsDiv = document.getElementById("suggestions");

startMicBtn.onclick = () => startAudio("mic");
stopMicBtn.onclick = () => stopAudio();
startSystemBtn.onclick = () => startAudio("system");
stopSystemBtn.onclick = () => stopAudio();

requestSuggestionBtn.onclick = async () => {
  const suggestions = await fetchSuggestions(conversationContext);
  suggestionsDiv.innerText = suggestions;
};

async function startAudio(mode) {
  if (audioContext) {
    console.warn("AudioContext already running.");
    return;
  }

  try {
    // Choisir micro ou system
    let stream;
    if (mode === "mic") {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } else {
      stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
    }
    currentStream = stream;

    // 1. Ouvrir le WS AssemblyAI
    assemblyAIWS = new WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&encoding=pcm_s16le&token=${token}&disable_partial_transcripts=true`);

    //wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&encoding=pcm_s16le&disable_partial_transcripts=true&word_boost=&enable_extra_session_information=false
    assemblyAIWS.onopen = () => {
      console.log("AssemblyAI WS connected");
    };
    assemblyAIWS.onerror = (err) => {
      console.error("AssemblyAI WS error:", err);
    };
    assemblyAIWS.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.text) {
        // partial ou final
        conversationContext += ` ${data.text}`;
        transcriptionDiv.innerText = conversationContext.trim();
      }
    };
    assemblyAIWS.onclose = () => {
      console.log("AssemblyAI WS closed");
    };

    // 2. Créer l'audioContext
    audioContext = new AudioContext({ sampleRate: 16000 });

    // 3. Charger le worklet
    await audioContext.audioWorklet.addModule("./recorderWorklet.js");

    // 4. Créer le worklet node
    workletNode = new AudioWorkletNode(audioContext, "recorder-processor", {
      outputChannelCount: [1],
    });

    // 5. Récupérer les buffers depuis le worklet
    workletNode.port.onmessage = (event) => {
      // event.data : Float32Array
      const float32Array = event.data;
      sendAudioToAssemblyAI(float32Array);
    };

    // 6. Connecter la source
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(workletNode).connect(audioContext.destination);

    console.log(mode + " capture started");
  } catch (err) {
    console.error("Error starting audio:", err);
  }
}

function stopAudio() {
  // Fermer l'audio
  if (workletNode) {
    workletNode.disconnect();
    workletNode = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  if (currentStream) {
    currentStream.getTracks().forEach((t) => t.stop());
    currentStream = null;
  }
  // Fermer WS
  if (assemblyAIWS) {
    assemblyAIWS.close();
    assemblyAIWS = null;
  }
  console.log("Audio capture stopped");
}

function sendAudioToAssemblyAI(float32Array) {
  // Convert Float32 -> Int16
  const int16Array = float32ToInt16(float32Array);

  // Convert int16 -> base64
  const base64Data = arrayBufferToBase64(int16Array.buffer);

  // Envoyer sur WS (si ouvert)
  if (assemblyAIWS && assemblyAIWS.readyState === WebSocket.OPEN) {
    assemblyAIWS.send(JSON.stringify({ audio_data: base64Data }));
  }
}

function float32ToInt16(float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}

// Conversion ArrayBuffer -> base64
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Appel backend pour suggestions
async function fetchSuggestions(context) {
  try {
    const resp = await fetch(SERVER_API_URL_SUGGESTIONS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context }),
    });
    if (!resp.ok) {
      const errorText = await resp.text();
      console.warn("Suggestion error:", resp.status, errorText);
      return "No suggestions";
    }
    const data = await resp.json();
    return data.suggestions || "No suggestions found";
  } catch (err) {
    console.error("Error fetching suggestions:", err);
    return "Error";
  }
}
