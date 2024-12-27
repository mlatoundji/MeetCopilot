// ----------------- Configuration -----------------
const SUGGESTIONS_API_URL = "http://localhost:3000/suggestions";
const TRANSCRIBE_WHISPER_API_URL = "http://localhost:3000/transcribe/whisper";
const TRANSCRIBE_ASSEMBLYAI_API_URL = "http://localhost:3000/transcribe/whisper";


const MIME_TYPE_WEBM = "audio/webm; codecs=opus";
const MIME_TYPE_OGG = "audio/ogg; codecs=opus";

// ----------------- Éléments du DOM -----------------
const captureButton = document.getElementById("captureButton");
const micButton = document.getElementById("micButton");
const suggestionButton = document.getElementById("suggestionButton");
const transcriptionDiv = document.getElementById("transcription");
const suggestionsDiv = document.getElementById("suggestions");
const meetingFrame = document.getElementById("meetingFrame");

// ----------------- Variables globales -----------------
let systemMediaStream = null;
let micMediaStream = null;
let mediaRecorder = null;
let isSystemRecording = false;
let isMicRecording = false;
let chunks = [];
let timeslice = 5000;

let UserMicName = "UserMic"
let SystemAudioName = "SystemAudio"

// Pseudo-contexte stockant la conversation
let conversationContext = `
[System] Voici une conversation. L'utilisateur discute avec un interlocuteur dans un contexte de réunion.
Informations sur la réunion : Utilisateur [${UserMicName}]; Interlocuteur : [${SystemAudioName}].
Suivez la conversation. 
`;

let suggestionText;

// ----------------- Fonctions utilitaires -----------------

/**
 * Récupère l'audio de l'onglet/fenêtre (et vidéo) via getDisplayMedia.
 * L'utilisateur doit sélectionner la fenêtre/onglet et cocher "Partager l'audio".
 */
async function getSystemAudioMedia() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true
    });
    return stream;
  } catch (err) {
    console.error("Error in getSystemAudioMedia:", err);
    return null;
  }
}

/**
 * Récupère l'audio du micro local via getUserMedia.
 */
async function getMicMedia() {
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

/**
 * Télécharge localement un blob en créant un lien temporaire.
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

/**
 * Lance un MediaRecorder sur un flux audio-only (filtre la piste audio).
 * callback sera appelé après l'arrêt pour traiter le blob.
 */
function startMediaRecorder(stream, callback) {
  // Filtrer la piste audio
  const audioTracks = stream.getAudioTracks();
  if (!audioTracks || audioTracks.length === 0) {
    alert("No audio track found. Make sure you've allowed audio capture.");
    return null;
  }

  // Créer un flux ne contenant que la piste audio
  const audioOnlyStream = new MediaStream();
  audioTracks.forEach(track => audioOnlyStream.addTrack(track));

  // Vérification mime
  let mimeType = MIME_TYPE_WEBM;
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = MIME_TYPE_OGG;
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      alert("No supported mimeType found (webm/ogg).");
      return null;
    }
  }

  // Démarrer l'enregistrement
  const recorder = new MediaRecorder(audioOnlyStream, { mimeType });
  chunks = [];
  let stop = false;

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0 && !stop) {
      chunks.push(e.data);
      blob = new Blob(chunks, { type: mimeType });
      callback(blob);
      //downloadBlob(blob, "recorded_audio.webm");
      stop = true;
      recorder.stop();
    }

  };

  recorder.onstop = async () => {
    // if (chunks.length === 0) {
    //   console.log("No chunks recorded.");
    //   // callback(null);
    //   return;
    // }
    // const blob = new Blob(chunks, { type: mimeType });
    // Télécharger localement (optionnel)
    // downloadBlob(blob, "recorded_audio.webm");
    // callback(blob);
    if(stream != null)
    {    
      chunks = [];
      stop = false;
      recorder.start(timeslice);
    }

  };

  // recorder.start();
  recorder.start(timeslice);
  return recorder;
}

// ----------------- Gestion du bouton System Capture -----------------
captureButton.addEventListener("click", async () => {
  if (!isSystemRecording) {
    systemMediaStream = await getSystemAudioMedia();
    if (systemMediaStream) {
      // Lance l'enregistrement
      mediaRecorder = startMediaRecorder(systemMediaStream, async (blob) => {
      if (blob) {
          // Transcription via Whisper
          const text = await transcribeViaWhisper(blob);
          if (text) {
            conversationContext += `\n[${SystemAudioName}] ${text}`;
            transcriptionDiv.innerText = conversationContext;
          }
      }
      });
      if (mediaRecorder) {
        isSystemRecording = true;
        captureButton.innerText = "Stop System Capture";
      }
    }
  } else {
    systemMediaStream?.getTracks().forEach(t => t.stop());
    systemMediaStream = null;
    isSystemRecording = false;
    if (mediaRecorder) mediaRecorder.stop();
    captureButton.innerText = "Start System Capture";
  }
});

// ----------------- Gestion du bouton Micro Capture -----------------
micButton.addEventListener("click", async () => {
  if (!isMicRecording) {
    micMediaStream = await getMicMedia();
    if (micMediaStream) {
      mediaRecorder = startMediaRecorder(micMediaStream, async (blob) => {
        if (blob) {
          // Transcription via Whisper
          const text = await transcribeViaWhisper(blob);
          if (text) {
            conversationContext += `\n[${UserMicName}] ${text}`;
            transcriptionDiv.innerText = conversationContext;
          }
        }
      });
      if (mediaRecorder) {
        isMicRecording = true;
        micButton.innerText = "Stop Mic";
      }
    }
  } else {
    isMicRecording = false;
    micMediaStream?.getTracks().forEach(t => t.stop());
    micMediaStream = null;
    if (mediaRecorder) mediaRecorder.stop();
    micButton.innerText = "Start Mic";
  }
});

// ----------------- Génération de suggestions -----------------
suggestionButton.addEventListener("click", async () => {
  suggestionText = await generateSuggestions(conversationContext);
  if (suggestionText?.length > 0) {
    suggestionsDiv.innerHTML = suggestionText+"\n\n";
  } else {
    suggestionsDiv.innerText = "No suggestions generated.";
  }
});

/**
 * Envoie le blob à l’API Whisper pour transcription.
 */
async function transcribeViaWhisper(blob) {
  const formData = new FormData();
  formData.append('audio', blob);

  try {
    const response = await fetch(TRANSCRIBE_WHISPER_API_URL, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    return data.transcription || '';
  } catch (err) {
    console.error('Error calling Whisper endpoint:', err);
    return '';
  }
}

/**
 * Envoie le blob à l’API AssemblyAI pour transcription.
 */
async function transcribeViaAssemblyAI(blob) {
  const formData = new FormData();
  formData.append('audio', blob);

  try {
    const response = await fetch(TRANSCRIBE_ASSEMBLYAI_API_URL, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    return data.transcription || '';
  } catch (err) {
    console.error('Error calling AssemblyAI endpoint:', err);
    return '';
  }
}

/**
 * Appelle l’API ChatGPT (ou GPT-4) pour générer des suggestions de réponse
 * par rapport à la "dernière question" trouvée dans la conversation.
 */
async function generateSuggestions(context) {

  if (!context || typeof context !== 'string') {
    console.warn("Invalid context provided:", context);
    return "No suggestions";
  }
  try {
    const response = await fetch(SUGGESTIONS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ context }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.warn("Suggestion error:", response.status, errorText);
      return "No suggestions";
    }
    const data = await response.json();
    return data.suggestions || 'No suggestions found';
  } catch (err) {
    console.error('Error calling Whisper endpoint:', err);
    return 'Error';
  }
}
