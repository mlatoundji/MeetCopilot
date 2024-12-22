import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg'
const ffmpeg = createFFmpeg({ log: true });


// ------------------ Configuration ------------------
// const OPENAI_API_KEY = "YOUR_OPENAI_API_KEY"; 
// const WHISPER_API_URL = "https://api.openai.com/v1/audio/transcriptions";

const TRANSCRIBE_API_URL = "http://localhost:3000//api/transcribe";

// Codec habituel pour l'audio
const MIME_TYPE_WEBM = "audio/webm; codecs=opus";
const MIME_TYPE_OGG = "audio/ogg; codecs=opus";

// Variable globale pour stocker la conversation transcrite
let conversationContext = "";

// ------------------ DOM Elements ------------------
const startMicBtn = document.getElementById("startMic");
const stopMicBtn = document.getElementById("stopMic");
const startSystemBtn = document.getElementById("startSystem");
const stopSystemBtn = document.getElementById("stopSystem");
const transcriptionDiv = document.getElementById("transcription");

// ------------------ Streams / Recorders ------------------
let micStream = null;
let micRecorder = null;
let systemStream = null;
let systemRecorder = null;

// ------------------ Start/Stop Microphone ------------------

startMicBtn.addEventListener("click", async () => {
  if (micRecorder) {
    console.log("Mic is already recording...");
    return;
  }
  micStream = await getUserMedia();
  if (!micStream) {
    alert("Could not get microphone stream");
    return;
  }
  // On lance un enregistrement "streaming" via timeslice
  micRecorder = startChunkedRecorder(micStream, "mic");
  micRecorder.start(10000);
});

stopMicBtn.addEventListener("click", () => {
  if (micRecorder) {
    micRecorder.stop();
    micRecorder = null;
  }
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }
});

// ------------------ Start/Stop System Audio ------------------

startSystemBtn.addEventListener("click", async () => {
  if (systemRecorder) {
    console.log("System is already recording...");
    return;
  }
  systemStream = await getSystemAudioMedia();
  if (!systemStream) {
    alert("Could not get system audio stream");
    return;
  }
  systemRecorder = startChunkedRecorder(systemStream, "system");
});

stopSystemBtn.addEventListener("click", () => {
  if (systemRecorder) {
    systemRecorder.stop();
    systemRecorder = null;
  }
  if (systemStream) {
    systemStream.getTracks().forEach(t => t.stop());
    systemStream = null;
  }
});

// ------------------ getUserMedia (micro) ------------------
async function getUserMedia() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    });
    return stream;
  } catch (err) {
    console.error("Error in getUserMedia:", err);
    return null;
  }
}

// ------------------ getSystemAudioMedia (tab/window) ------------------
async function getSystemAudioMedia() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true
    });
    return stream;
  } catch (err) {
    console.error("Error in getDisplayMedia:", err);
    return null;
  }
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

}

// ------------------ startChunkedRecorder ------------------
/**
 * Lance un MediaRecorder qui envoie un chunk toutes les X millisecondes (1000ms).
 * On fait l'appel à Whisper à chaque chunk pour un effet "pseudo-streaming".
 */
function startChunkedRecorder(stream, label) {
  // Vérif piste audio
  const audioTracks = stream.getAudioTracks();
  if (!audioTracks || audioTracks.length === 0) {
    alert("No audio track found for " + label);
    return null;
  }

  // On crée un nouveau MediaStream ne contenant que l'audio
  const audioOnlyStream = new MediaStream();
  audioTracks.forEach(track => audioOnlyStream.addTrack(track));

  // Choix du mime type
  let mimeType = MIME_TYPE_WEBM;
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = MIME_TYPE_OGG;
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      alert("No supported mimeType found. Stopping...");
      return null;
    }
  }

  const recorder = new MediaRecorder(audioOnlyStream, { mimeType });

  // Collecte des chunks
  recorder.ondataavailable = async (e) => {
    if (!e.data || e.data.size === 0) {
      // chunk vide
      return;
    }
    // Optionnel : Détection de silence ? -> Analyser e.data

    // console.log(" Data available for " + label, e.data.size);
    // downloadBlob(e.data, `${label}-chunk-${Date.now()}.webm`);

    try {
      // 1. Corriger le fragment

    const audioBlob = e.data;
    //const audioFile = new File([audioBlob], 'audio.webm', { type: mimeType });

    const fixedAudioFile = await fixAudioHeaders(audioBlob);


    // Envoyer direct à Whisper
    const text = await transcribeChunk(fixedAudioFile);
    if (text) {
      // Mise à jour de la conversation
      conversationContext += `\n[${label}] ${text}`;
      // Option : on peut vider conversationContext si on veut "réinitialiser" après chaque chunk
      // conversationContext = "";

      // Afficher la conversation courante
      transcriptionDiv.innerText = conversationContext.trim();
    }
  };

  // // start() avec timeslice => ondataavailable est déclenché toutes les 3000ms
  // recorder.start(5000);

  console.log(label + " recorder started in chunked mode...");
  return recorder;
}

async function fixAudioHeaders(audioFile) {
  if (!ffmpeg.isLoaded()) {
      await ffmpeg.load();
  }

  // Charger le fichier audio dans ffmpeg.js (en RAM)
  ffmpeg.FS('writeFile', 'input.webm', await fetchFile(audioFile));

  // Convertir le fichier en réécrivant le conteneur WebM
  await ffmpeg.run('-i', 'input.webm', '-c', 'copy', 'output.webm');

  // Récupérer le fichier audio corrigé
  const data = ffmpeg.FS('readFile', 'output.webm');
  const fixedAudioBlob = new Blob([data.buffer], { type: 'audio/webm' });
  return new File([fixedAudioBlob], 'fixed_audio.webm', { type: 'audio/webm' });
}


// ------------------ Transcription d'un chunk ------------------
async function transcribeChunk(file) {
  // if (!OPENAI_API_KEY || OPENAI_API_KEY.startsWith("YOUR_OPENAI_API_KEY")) {
  //   console.warn("No valid OPENAI_API_KEY provided for chunk. Skipping...");
  //   return "";
  // }

  // Construction du FormData
  const formData = new FormData();
  formData.append("file", file);
  formData.append("model", "whisper-1");

  try {
    const response = await fetch(TRANSCRIBE_API_URL, {
      method: "POST",
      body: formData
    });

    // const response = await fetch(WHISPER_API_URL, {
    //   method: "POST",
    //   headers: {
    //     Authorization: `Bearer ${OPENAI_API_KEY}`
    //   },
    //   body: formData
    // });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Whisper chunk error:", response.status, errorText);
      return "";
    }

    const data = await response.json();
    const partialText = data.text || "";

    if (!partialText.trim()) {
      // Peut être du silence
      return "";
    }
    return partialText;
  } catch (err) {
    console.error("Error calling Whisper for chunk:", err);
    return "";
  }
}
