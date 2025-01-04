import { WaveFile } from 'wavefile';

// ----------------- Configuration -----------------
const SUMMARY_API_URL = "http://localhost:3000/summary";
const SUGGESTIONS_API_URL = "http://localhost:3000/suggestions";
const TRANSCRIBE_WHISPER_API_URL = "http://localhost:3000/transcribe/whisper";
const TRANSCRIBE_ASSEMBLYAI_API_URL = "http://localhost:3000/transcribe/assemblyai";


const MIME_TYPE_WAV= "audio/wav";
const AUDIO_WAV_FILE_NAME= "audio.wav";


// ----------------- Éléments du DOM -----------------
const captureButton = document.getElementById("captureButton");
const micButton = document.getElementById("micButton");
const suggestionButton = document.getElementById("suggestionButton");
const transcriptionDiv = document.getElementById("transcription");
const suggestionsDiv = document.getElementById("suggestions");
const videoElement = document.getElementById("screen-capture");

// ----------------- Variables globales -----------------
let systemMediaStream = null;
let systemAudioContext = null;
let systemSource;
let systemRecorder;
let systemBuffer = [];
let systemTranscription = null;
let isSystemRecording = false;


let micMediaStream = null;
let micAudioContext = null;
let micSource;
let micRecorder;
let micBuffer = [];
let micTranscription = null;
let isMicRecording = false;

let timeslice = 4000;


let UserMicName = "UserMic";
let SystemAudioName = "SystemAudio";

// Pseudo-contexte stockant la conversation

let meetingDetails = "";
// Références aux éléments DOM
const addMeetingButton = document.getElementById("addMeetingButton");
const meetingModal = document.getElementById("meetingModal");
const modalOverlay = document.getElementById("modalOverlay");
const dynamicFields = document.getElementById("dynamicFields");
const saveMeetingButton = document.getElementById("saveMeetingButton");
const closeMeetingButton = document.getElementById("closeMeetingButton");
const langSelect = document.getElementById("langSelect");

let conversationContext = "";

let conversationContextHeader = "";

let conversationContextSummaries = "";
let conversationContextDialogs = "";

let summaries = [];
let lastSummarySegment = "";
let lastSummaryTime = Date.now();
const SUMMARY_INTERVAL_MINUTES = 15;
const SUMMARY_INTERVAL = SUMMARY_INTERVAL_MINUTES * 60 * 1000; // 15 minutes
let currentSummarieslength = summaries.length;

let suggestionText;

const supportedLangs = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  // Ajoutez d’autres
];

let langSelected = "fr";
// main.js
const translations = {
  fr: {
    startSystemCapture: "Démarrer la capture système",
    startMic: "Démarrer le micro",
    generateSuggestions: "Générer des suggestions",
    addMeeting: "Ajouter une réunion",
    suggestionsPlaceholder: "Les suggestions apparaîtront ici...",
    transcriptionPlaceholder: "La transcription apparaîtra ici...",
    meetingModalTitle: "Ajouter une réunion",
    validateButton: "Valider",
    closeButton: "Fermer",
    ContextKeys: ["Titre du poste", "Missions", "Informations sur l'entreprise", "Informations sur le candidat (utilisateur)", "Informations complémentaires"],
    conversationContextHeader : `
    [System] Voici une conversation. L'utilisateur discute avec un interlocuteur dans un contexte de réunion.
    Informations sur la réunion : 
    * Utilisateur : [${UserMicName}]
    * Interlocuteur : [${SystemAudioName}]
    ${meetingDetails}
    Suivez la conversation\n
    `,
    // ... etc.
  },
  en: {
    startSystemCapture: "Start System Capture",
    startMic: "Start Mic",
    generateSuggestions: "Generate Suggestions",
    addMeeting: "Add Meeting",
    suggestionsPlaceholder: "Suggestions will appear here...",
    transcriptionPlaceholder: "Transcription will appear here...",
    meetingModalTitle: "Add Meeting",
    validateButton: "Validate",
    closeButton: "Close",
    ContextKeys: ["Job Title", "Missions", "Company Information", "Candidate (User) Information", "Additional Information"],
    conversationContextHeader : `
      [System] This is a conversation. The user is chatting with a conversation partner in a meeting context.
      Meeting information:
      * User: [${UserMicName}]
      * Conversation partner: [${SystemAudioName}]
      ${meetingDetails}
      Follow the conversation\n
    `
  },
  // Ajoutez d’autres langues si besoin
};


function extractLastSegment() {
  const lines = conversationContextDialogs.split("\n");
  const lastN = lines.slice(-3).join("\n"); // Ex: On prend 3 lignes
  return lastN;
}

// ---------------------------------------------------
// Exemple de fonction qui, toutes les 15 min, appelle /generateSummary
async function maybeGenerateSummary() {
  const now = Date.now();
  if ((now - lastSummaryTime) >= SUMMARY_INTERVAL) {
    // On prend la portion de conversation accumulée depuis 15 minutes
    // ex. lastSummarySegment = (conversationContext - l'ancienne portion)
    // const segmentText = conversationContext.substring(conversationContext.indexOf(lastSummarySegment) + lastSummarySegment.length);

    console.log("Generating summary...");
    console.log("Now : " + now + "lastSummaryTime : " + lastSummaryTime);
    console.log("Period : " + now - lastSummaryTime);

    lastSummaryTime = now;
    const summary = await generateSummary(conversationContext);

    if(summary != "No summary found" && summary != "Error"){

      lastSummarySegment = summary; 
      summaries.push(lastSummarySegment);
    }
    return summary;
  }

  return null;
}

async function updateConversationContext() {

  conversationContextHeader = translations[langSelected].conversationContextHeader;

  const summary = await maybeGenerateSummary();

  if(summaries.length > 0 && summary != null){
    conversationContextSummaries =  "== Résumé de chaque quart heure précédent ==\n"
    conversationContextSummaries += summaries.map((key, index) => `Résumé #${index+1} (Tranche ${0+SUMMARY_INTERVAL_MINUTES*index}-${SUMMARY_INTERVAL_MINUTES+SUMMARY_INTERVAL_MINUTES*index}min) : ${key}`).join("\n");
    conversationContextSummaries += "\n";
  }

  if(summaries.length > 0 && currentSummarieslength < summaries.length && summary != null){
    currentSummarieslength = summaries.length;
    let lastSegment = extractLastSegment();
    conversationContextDialogs = "== Dernières phrases de la conversation : ==\n";
    conversationContextDialogs += lastSegment;
  }

  conversationContext = `
  ${conversationContextHeader}
  ${conversationContextSummaries} 
  ${conversationContextDialogs}
  `;
  transcriptionDiv.innerText = conversationContext;
}

function applyTranslations(langCode) {
  const t = translations[langCode];

  // Mettre à jour les textes des boutons dans la sidebar
  captureButton.textContent = t.startSystemCapture;
  micButton.textContent = t.startMic;
  suggestionButton.textContent = t.generateSuggestions;
  addMeetingButton.textContent = t.addMeeting;

  // Mettre à jour les placeholders
  suggestionsDiv.textContent = t.suggestionsPlaceholder;
  transcriptionDiv.textContent = t.transcriptionPlaceholder;

  // Mettre à jour le titre de la modale
  document.querySelector(".meeting-modal h2").textContent = t.meetingModalTitle;

  // Boutons Valider/Fermer dans la modale
  saveMeetingButton.textContent = t.validateButton;
  closeMeetingButton.textContent = t.closeButton;
  
}

// Once DOM is loaded:
document.addEventListener('DOMContentLoaded', () => {

  // Dynamically add options
  supportedLangs.forEach(lang => {
    const option = document.createElement("option");
    option.value = lang.code;
    option.textContent = lang.label;
    langSelect.appendChild(option);
  });

  // If you want to attach a change event:
  langSelect.addEventListener("change", () => {
    console.log("Selected language:", langSelect.value);
    langSelected = langSelect.value;
    applyTranslations(langSelected);
  });
  applyTranslations(langSelected);

});

document.addEventListener("keydown", (event) => {
  if (event.code === "Space" && meetingModal.style.display === "none") {
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
  translations[langSelected].ContextKeys.forEach(key => {
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
  const values =  translations[langSelected].ContextKeys.map(key => {
    const input = document.getElementById(`input-${key}`);
    return input.value.trim();
  });
  meetingDetails =  translations[langSelected].ContextKeys.map((key, index) => `* ${key} : ${values[index]}`).join("\n");
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


// ----------------- Gestion du bouton System Capture -----------------
captureButton.addEventListener("click", async () => {
  if (!isSystemRecording) {
    systemMediaStream = await getSystemAudioMedia();
    if (systemMediaStream) {
      // Lance l'enregistrement
      videoElement.srcObject = systemMediaStream;
      videoElement.autoplay = true;
      // Créer un contexte audio
      systemAudioContext = new AudioContext();
      // Créer une source audio
      systemSource = systemAudioContext.createMediaStreamSource(systemMediaStream);
      // Créer un processeur audio
      systemRecorder = systemAudioContext.createScriptProcessor(4096, 1, 1);
      // Connecter la source à l'enregistreur
      systemSource.connect(systemRecorder);
      // Connecter l'enregistreur à la destination
      systemRecorder.connect(systemAudioContext.destination);
      // Démarrer l'enregistrement
      systemRecorder.onaudioprocess = (event) => {
        const audioData = event.inputBuffer.getChannelData(0);
        systemBuffer.push(new Float32Array(audioData));
      };
      if (systemRecorder) {
        isSystemRecording = true;
        lastSummaryTime = Date.now();
        captureButton.innerText = "Stop System Capture";
        startSystemTranscription();
      }
    }
  } else {
    systemMediaStream?.getTracks().forEach(t => t.stop());
    systemMediaStream = null;
    isSystemRecording = false;
    if (systemRecorder) {
      systemRecorder.onaudioprocess = null;
      systemSource.disconnect(systemRecorder);
      systemRecorder.disconnect(systemAudioContext.destination);
    }
    systemAudioContext.close();
    captureButton.innerText = "Start System Capture";
    stopSystemTranscription();
  }

});

function startSystemTranscription() {
  systemTranscription = setInterval( async function() {
    if (systemBuffer.length > 0) {
      const audioBuffer = systemBuffer.reduce((acc, val) => {
        const tmp = new Float32Array(acc.length + val.length);
        tmp.set(acc, 0);
        tmp.set(val, acc.length);
        return tmp;
      }, new Float32Array());
  
      const wavBlob = bufferToWaveBlob(audioBuffer, systemAudioContext.sampleRate);
      
      systemBuffer = [];

      if (wavBlob) {
          // Transcription via Whisper
          const text = await transcribeViaWhisper(wavBlob);
          if (text) {
            const filteredText = filterTranscription(text);
            if (filteredText !== "") {  
              
              conversationContextDialogs += `\n[${SystemAudioName}] ${filteredText}`;
              await updateConversationContext();
            
            }       
          }
      }
    }
}, timeslice);
}

function stopSystemTranscription() {
  clearInterval(systemTranscription);
}

// ----------------- Gestion du bouton Micro Capture -----------------
micButton.addEventListener("click", async () => {
  if (!isMicRecording) {
    micMediaStream = await getMicMedia();
    if (micMediaStream) {
      // Créer un contexte audio
      micAudioContext = new AudioContext();
      // Créer une source audio
      micSource = micAudioContext.createMediaStreamSource(micMediaStream);
      // Créer un processeur audio
      micRecorder = micAudioContext.createScriptProcessor(4096, 1, 1);
      // Connecter la source à l'enregistreur
      micSource.connect(micRecorder);
      // Connecter l'enregistreur à la destination
      micRecorder.connect(micAudioContext.destination);
      // Démarrer l'enregistrement
      micRecorder.onaudioprocess = (event) => {
        const audioData = event.inputBuffer.getChannelData(0);
        micBuffer.push(new Float32Array(audioData));
      };
      if (micRecorder) {
        isMicRecording = true;
        lastSummaryTime = Date.now();
        micButton.innerText = "Stop Mic";
        startMicTranscription();
      }
    }
  } else {
    isMicRecording = false;
    micMediaStream?.getTracks().forEach(t => t.stop());
    micMediaStream = null;
    if (micRecorder) {
      micRecorder.onaudioprocess = null;
      micSource.disconnect(micRecorder);
      micRecorder.disconnect(micAudioContext.destination);
    }
    micAudioContext.close();
    micButton.innerText = "Start Mic";
    stopMicTranscription();
  }
});

function startMicTranscription() {
  micTranscription = setInterval( async function() {
    if (micBuffer.length > 0) {
      const audioBuffer = micBuffer.reduce((acc, val) => {
        const tmp = new Float32Array(acc.length + val.length);
        tmp.set(acc, 0);
        tmp.set(val, acc.length);
        return tmp;
      }, new Float32Array());
  
      const wavBlob = bufferToWaveBlob(audioBuffer, micAudioContext.sampleRate);
      
      micBuffer = [];

      if (wavBlob) {
          // Transcription via Whisper
          const text = await transcribeViaWhisper(wavBlob);
          if (text) {
            const filteredText = filterTranscription(text);
            if (filteredText !== "") {  
              
              conversationContextDialogs += `\n[${UserMicName}] ${filteredText}`;
              await updateConversationContext();
            
            }       
          }
      }
    }
}, timeslice);
}

function stopMicTranscription() {
  clearInterval(micTranscription);
}

// ----------------- Génération de suggestions -----------------
suggestionButton.addEventListener("click", async () => {
  suggestionText = await generateSuggestions(conversationContext);
  if (suggestionText?.length > 0) {
    suggestionsDiv.innerHTML = suggestionText+"\n\n";
  } else {
    suggestionsDiv.innerText = "No suggestions generated.";
  }
});

function bufferToWaveBlob(audioBuffer, sampleRate) {
  // On crée une instance WaveFile
  const wav = new WaveFile();
  // On y injecte nos données brutes (32 bits float, mono)
  wav.fromScratch(1, sampleRate, '32f', audioBuffer);

  // On récupère ensuite un Blob WAV valide
  const wavBlob = new Blob([wav.toBuffer()], { type: 'audio/wav' });
  return wavBlob;
}


async function transcribeViaWhisper(blob) {

  const formData = new FormData();
  formData.append('audio', blob);
  formData.append('langCode', langSelected);
  formData.append('model', 'whisper-1');
  formData.append('mimeType', MIME_TYPE_WAV);
  formData.append('fileName', AUDIO_WAV_FILE_NAME);

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
  formData.append('langCode', langSelected);

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
    console.error('Error calling Suggestions endpoint:', err);
    return 'Error';
  }
}

async function generateSummary(context) {

  if (!context || typeof context !== 'string') {
    console.warn("Invalid context provided:", context);
    return "No summary";
  }
  try {
    const response = await fetch(SUMMARY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ context }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.warn("summary error:", response.status, errorText);
      return "No summary";
    }
    const data = await response.json();
    return data.summary || 'No summary found';
  } catch (err) {
    console.error('Error calling Summary endpoint:', err);
    return 'Error';
  }
}

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