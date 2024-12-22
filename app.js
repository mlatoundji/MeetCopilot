// ---------- Configuration ----------
const OPENAI_API_KEY = "YOUR_OPENAI_API_KEY"; // Pour la démo seulement, attention à la sécurité !
const MIME_TYPE_WEBM = "audio/webm; codecs=opus";
const MIME_TYPE_OGG = "audio/ogg; codecs=opus";

// ---------- Éléments du DOM ----------
const captureButton = document.getElementById("captureButton");
const transcriptionDiv = document.getElementById("transcription");

// ---------- Variables globales ----------
let mediaStream = null;
let mediaRecorder = null;
let chunks = [];
let isRecording = false;

// ---------- Fonctions ----------

// Récupération d'un flux (vidéo + audio) via getDisplayMedia
// pour que l'utilisateur puisse sélectionner un onglet ou une fenêtre
async function getSystemAudioMedia() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    alert("getDisplayMedia is not supported in this browser.");
    return null;
  }

  try {
    // audio: true, video: true => l'utilisateur doit sélectionner un onglet/fenêtre
    // et cocher "Partager l'audio" si le navigateur le propose
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

// Lance l'enregistrement en utilisant MediaRecorder
function startRecording() {
  if (!mediaStream) {
    alert("No mediaStream available.");
    return;
  }

  //On vérifie la présence d'une piste audio
  const audioTracks = mediaStream.getAudioTracks();
  if (!audioTracks || audioTracks.length === 0) {
    alert("No audio track found in the selected stream. Make sure to share audio.");
    return;
  }

const audioOnlyStream = new MediaStream();
audioTracks.forEach(track => {
  audioOnlyStream.addTrack(track);
});

  // Vérification du support mimeType
  let mimeType = MIME_TYPE_WEBM;
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = MIME_TYPE_OGG;
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      alert("No supported mimeType found (webm/ogg) on this browser.");
      return;
    }
  }

  chunks = [];
  mediaRecorder = new MediaRecorder(audioOnlyStream, { mimeType });

  // Quand un chunk est disponible
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  // À l'arrêt, on crée le blob, on le télécharge et on envoie à Whisper
  mediaRecorder.onstop = async () => {
    if (chunks.length === 0) {
      console.log("No chunks recorded.");
      return;
    }

    const blob = new Blob(chunks, { type: mimeType });

    // 1) Téléchargement local du blob
    downloadBlob(blob, "recorded_audio.webm");

    // 2) Transcription via Whisper
    const transcriptionText = await transcribeViaWhisper(blob);
    if (transcriptionText) {
      transcriptionDiv.innerText = `Transcription:\n${transcriptionText}`;
    }
  };

  mediaRecorder.start();
  isRecording = true;
  captureButton.innerText = "Stop Capture";
}

// Stoppe l'enregistrement
function stopRecording() {
  if (mediaRecorder) {
    mediaRecorder.stop();
  }
  if (mediaStream) {
    // On arrête toutes les pistes (audio et vidéo)
    mediaStream.getTracks().forEach(track => track.stop());
  }
  mediaStream = null;
  mediaRecorder = null;
  isRecording = false;
  captureButton.innerText = "Start Capture";
}

// Télécharge localement un blob en créant un lien temporaire
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

// Envoie le blob à l'API Whisper (OpenAI) pour transcription
async function transcribeViaWhisper(blob) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY.startsWith("YOUR_OPENAI_API_KEY")) {
    console.warn("No valid OPENAI_API_KEY provided, skipping Whisper call.");
    return "";
  }

  // On construit un FormData
  const formData = new FormData();
  // On convertit le blob en File
  const file = new File([blob], "audio.webm", { type: blob.type });
  formData.append("file", file);
  formData.append("model", "whisper-1");

  try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`
        // Ne mettez pas de Content-Type ici, fetch + FormData s'en chargent
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Whisper API error:", response.status, errorText);
      return "";
    }

    const data = await response.json();
    return data.text || "";
  } catch (err) {
    console.error("Error calling Whisper API:", err);
    return "";
  }
}

// ---------- Gestion du bouton Start/Stop ----------
captureButton.addEventListener("click", async () => {
  if (!isRecording) {
    // Commencer la capture
    mediaStream = await getSystemAudioMedia();
    if (mediaStream) {
      startRecording();
    }
  } else {
    // Arrêter la capture
    stopRecording();
  }
});
