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
const videoElement = document.getElementById("screen-capture");

// ----------------- Variables globales -----------------
let systemMediaStream = null;
let micMediaStream = null;
let mediaRecorder = null;
let isSystemRecording = false;
let isMicRecording = false;
let chunks = [];
let timeslice = 5000;

let UserMicName = "UserMic";
let SystemAudioName = "SystemAudio";
let MeetContext = "MeetContext";

// Pseudo-contexte stockant la conversation

const ContextKeys = ["Titre du poste", "Missions", "Informations sur l'entreprise", "Informations sur le candidat (utilisateur)", "Informations complémentaires"];
let meetingDetails = "";
// Références aux éléments DOM
const addMeetingButton = document.getElementById("addMeetingButton");
const meetingModal = document.getElementById("meetingModal");
const modalOverlay = document.getElementById("modalOverlay");
const dynamicFields = document.getElementById("dynamicFields");
const saveMeetingButton = document.getElementById("saveMeetingButton");
const closeMeetingButton = document.getElementById("closeMeetingButton");

let conversationContext = `
[System] Voici une conversation. L'utilisateur discute avec un interlocuteur dans un contexte de réunion.
Informations sur la réunion : 
* Utilisateur : [${UserMicName}]
* Interlocuteur : [${SystemAudioName}]
${meetingDetails}
Suivez la conversation et générez des suggestions de réponses à la dernière question posée à l'utilisateur. 
`;

let suggestionText;

document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    suggestionButton.click();
  } else if (event.code === "KeyM") {
    micButton.click();
  } else if (event.code === "KeyC") {
    captureButton.click();
  }
});

// ----------------- Fonctions utilitaires -----------------

// Ouvrir la fenêtre modale
addMeetingButton.addEventListener("click", () => {
  dynamicFields.innerHTML = ""; // Reset des champs
  ContextKeys.forEach(key => {
    const label = document.createElement("label");
    label.innerText = key;
    const input = document.createElement("input");
    input.type = "text";
    input.id = `input-${key}`;
    input.style.display = "block";
    input.style.marginBottom = "10px";
    dynamicFields.appendChild(label);
    dynamicFields.appendChild(input);
  });
  meetingModal.style.display = "block";
  modalOverlay.style.display = "block";
});

// Fermer la fenêtre modale
closeMeetingButton.addEventListener("click", () => {
  meetingModal.style.display = "none";
  modalOverlay.style.display = "none";
});

// Sauvegarder les informations
saveMeetingButton.addEventListener("click", () => {
  const values = ContextKeys.map(key => {
    const input = document.getElementById(`input-${key}`);
    return input.value.trim();
  });
  meetingDetails = ContextKeys.map((key, index) => `* ${key} : ${values[index]}`).join("\n");
  console.log("Détails de la réunion :\n", meetingDetails);

  // Fermer la fenêtre modale
  meetingModal.style.display = "none";
  modalOverlay.style.display = "none";
});

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
      videoElement.srcObject = systemMediaStream;
      videoElement.autoplay = true;
      mediaRecorder = startMediaRecorder(systemMediaStream, async (blob) => {
      if (blob) {
          // Transcription via Whisper
          const text = await transcribeViaAssemblyAI(blob);
          if (text) {
            const filteredText = filterTranscription(text);
            if (filteredText !== "") {  
              
              conversationContext += `\n[${SystemAudioName}] ${filteredText}`;
              transcriptionDiv.innerText = conversationContext;
            
            }       
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

/**
 * Filtre les textes indésirables dans une transcription.
 * @param {string} text - La transcription à nettoyer.
 * @returns {string} - Le texte nettoyé.
 */
function filterTranscription(text) {
  const filterOutBiasesStatics = [
    "Merci d'avoir regardé cette vidéo.",
    "Merci d'avoir regardé cette vidéo!",
    "Merci d'avoir regardé cette vidéo !",
    "Merci d'avoir regardé la vidéo.",
    "J'espère que vous avez apprécié la vidéo.",
    "Je vous remercie de vous abonner",
    "Sous-titres réalisés para la communauté d'Amara.org",
    "Sous-titres réalisés para la communauté d'Amara.org",
    "Merci d'avoir regardé!",
    "❤️ par SousTitreur.com",
    "— Sous-titrage ST'501 —",
    "Sous-titrage ST' 501",
    "Thanks for watching!",
    "Sous-titrage Société Radio-Canada",
    "sous-titres faits par la communauté d'Amara.org",
    "Merci."
  ];

  // Expressions régulières pour détecter des variantes dynamiques
  const regexPatterns = [
    /Sous-titres? r[ée]alis[ée]s? (par|para) la communaut[ée] d'Amara\.org/i,
    /Merci d'avoir regard[ée] la (vidéo|vid[ée]o)!?/i
  ];

  // Suppression des correspondances exactes
  filterOutBiasesStatics.forEach(bias => {
    text = text.replaceAll(bias, "");
  });

  // Suppression des correspondances via regex
  regexPatterns.forEach(pattern => {
    text = text.replace(pattern, "");
  });

  // Nettoyage des espaces inutiles
  return text.trim();
}

// ----------------- Gestion du bouton Micro Capture -----------------
micButton.addEventListener("click", async () => {
  if (!isMicRecording) {
    micMediaStream = await getMicMedia();
    if (micMediaStream) {
      mediaRecorder = startMediaRecorder(micMediaStream, async (blob) => {
        if (blob) {
          // Transcription via Whisper
          const text = await transcribeViaAssemblyAI(blob);
          if (text) {
            const filteredText = filterTranscription(text);
            if (filteredText !== "") {
              conversationContext += `\n[${UserMicName}] ${filteredText}`;
              transcriptionDiv.innerText = conversationContext;
            }
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
