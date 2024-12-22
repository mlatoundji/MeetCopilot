// ----------------- Configuration -----------------
const OPENAI_API_KEY = "YOUR_OPENAI_API_KEY"; // Démo uniquement, pas sécurisé.
const WHISPER_API_URL = "https://api.openai.com/v1/audio/transcriptions";
const GPT_COMPLETION_URL = "https://api.openai.com/v1/chat/completions";

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

// Pseudo-contexte stockant la conversation
let conversationContext = `
[System] This is the conversation context. The user is discussing a meeting scenario. 
Keep track of the conversation. 
`;

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
 * Envoie le blob à l’API Whisper pour transcription.
 */
async function transcribeViaWhisper(blob) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY.startsWith("YOUR_OPENAI_API_KEY")) {
    console.warn("No valid OPENAI_API_KEY provided, skipping Whisper call.");
    return "";
  }

  const formData = new FormData();
  const file = new File([blob], "audio.webm", { type: blob.type });
  formData.append("file", file);
  formData.append("model", "whisper-1");

  try {
    const response = await fetch(WHISPER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`
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

/**
 * Lance un MediaRecorder sur un flux audio-only (filtre la piste audio).
 * callbackOnStop sera appelé après l'arrêt pour traiter le blob.
 */
function startMediaRecorder(stream, callbackOnStop) {
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

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  recorder.onstop = async () => {
    if (chunks.length === 0) {
      console.log("No chunks recorded.");
      callbackOnStop(null);
      return;
    }
    const blob = new Blob(chunks, { type: mimeType });
    // Télécharger localement (optionnel)
    //downloadBlob(blob, "recorded_audio.webm");
    callbackOnStop(blob);
  };

  recorder.start();
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
            conversationContext += `\n[SystemAudio] ${text}`;
            transcriptionDiv.innerText = text;
          }
        }
        // Nettoyage
        systemMediaStream?.getTracks().forEach(t => t.stop());
        systemMediaStream = null;
      });
      if (mediaRecorder) {
        isSystemRecording = true;
        captureButton.innerText = "Stop System Capture";
      }
    }
  } else {
    if (mediaRecorder) mediaRecorder.stop();
    isSystemRecording = false;
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
            conversationContext += `\n[UserMic] ${text}`;
            transcriptionDiv.innerText = text;
          }
        }
        // Nettoyage
        micMediaStream?.getTracks().forEach(t => t.stop());
        micMediaStream = null;
      });
      if (mediaRecorder) {
        isMicRecording = true;
        micButton.innerText = "Stop Mic";
      }
    }
  } else {
    if (mediaRecorder) mediaRecorder.stop();
    isMicRecording = false;
    micButton.innerText = "Start Mic";
  }
});

// ----------------- Génération de suggestions -----------------
suggestionButton.addEventListener("click", async () => {
  const suggestions = await generateSuggestions(conversationContext);
  if (suggestions?.length > 0) {
    suggestionsDiv.innerHTML = suggestions.join("\n\n");
  } else {
    suggestionsDiv.innerText = "No suggestions generated.";
  }
});

/**
 * Appelle l’API ChatGPT (ou GPT-4) pour générer des suggestions de réponse
 * par rapport à la "dernière question" trouvée dans la conversation.
 */
async function generateSuggestions(context) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY.startsWith("YOUR_OPENAI_API_KEY")) {
    console.warn("No valid OPENAI_API_KEY provided, skipping ChatGPT call.");
    return [];
  }

  // On fait semblant de détecter la dernière question dans le contexte.
  // Dans un vrai usage, on ferait du NLP, ou on passerait tout le contexte à GPT.
  const systemPrompt = `
    You are an AI assistant specialized in summarizing and generating 
    suggestions for user replies in a conversation. 
    Provide 3 potential response suggestions in a bullet-list format. 
    Base your suggestions on the context below:
  `;

  // On prépare un appel chat complet
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: context }
  ];

  try {
    const response = await fetch(GPT_COMPLETION_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4", // ou "gpt-4", si vous y avez accès
        messages,
        max_tokens: 200,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ChatGPT API error:", response.status, errorText);
      return [];
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || "";
    // On peut découper par "\n" ou autre, selon la mise en forme souhaitée
    return [assistantMessage];
  } catch (err) {
    console.error("Error calling ChatGPT API:", err);
    return [];
  }
}
