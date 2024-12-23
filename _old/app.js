// ------------------ Configuration ------------------
const TRANSCRIBE_API_URL = "http://localhost:3000/api/transcribe"; 
// Vous pointez vers l'endpoint Node.js exposé par transcribe.js

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
  micRecorder = startChunkedRecorder(micStream, "mic");
  // timeslice à 10s
  if (micRecorder) {
    micRecorder.start(10000);
    console.log("Mic recorder started, slice every 10s");
  }
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
  if (systemRecorder) {
    // Par exemple, on ne fixe pas la durée ici,
    // ou on peut la fixer à 10s également.
    systemRecorder.start(10000);
    console.log("System recorder started, slice every 10s");
  }
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

/**
 * Télécharge localement un blob (optionnel).
 * Utile pour debug, si vous souhaitez voir ce qui est généré.
 */
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
 * Crée un MediaRecorder pour un stream audio-only + timeslice.
 * On corrige chaque chunk via ffmpeg.js et on envoie à /api/transcribe.
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

  recorder.ondataavailable = async (e) => {
    if (!e.data || e.data.size === 0) {
      // chunk vide
      return;
    }

    try {
      // Pour debug, vous pouvez télécharger localement :
      // downloadBlob(e.data, `${label}-chunk-${Date.now()}.webm`);

      // 1. Corriger le fragment via ffmpeg.js
      // const fixedAudioFile = await fixAudioHeaders(e.data);

      // 2. Envoyer direct au backend /api/transcribe
      const text = await transcribeChunk(e.data);
      if (text) {
        // Mise à jour de la conversation
        conversationContext += `\n[${label}] ${text}`;
        // Afficher la conversation courante
        transcriptionDiv.innerText = conversationContext.trim();
      }
    } catch (err) {
      console.error("Error while processing chunk:", err);
    }
  };

  console.log(label + " recorder prepared in chunked mode...");
  return recorder;
}

// ------------------ fixAudioHeaders ------------------
// async function fixAudioHeaders(audioBlob) {
//   // Charger ffmpeg si pas déjà fait
//   if (!ffmpeg.isLoaded()) {
//     await ffmpeg.load();
//   }

//   // Écrire "input.webm" dans le FS virtuel
//   ffmpeg.FS('writeFile', 'input.webm', await fetchFile(audioBlob));

//   // Réécrire le conteneur sans ré-encoder
//   await ffmpeg.run('-i', 'input.webm', '-c', 'copy', 'output.webm');

//   // Récupérer le fichier audio corrigé
//   const data = ffmpeg.FS('readFile', 'output.webm');
//   const fixedAudioBlob = new Blob([data.buffer], { type: 'audio/webm' });
//   return new File([fixedAudioBlob], 'fixed_audio.webm', { type: 'audio/webm' });
// }

// ------------------ transcribeChunk ------------------
async function transcribeChunk(file) {
  // On ne gère pas la clé ici, on envoie au backend Node.js
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(TRANSCRIBE_API_URL, {
      method: "POST",
      body: formData
    });

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
    console.error("Error calling /api/transcribe for chunk:", err);
    return "";
  }
}
