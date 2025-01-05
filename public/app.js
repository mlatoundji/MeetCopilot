import { AudioCapture } from './modules/audioCapture.js';
import { TranscriptionHandler } from './modules/transcriptionHandler.js';
import { UIHandler } from './modules/uiHandler.js';
import { SuggestionsHandler } from './modules/suggestionsHandler.js';
import { ConversationContextHandler } from './modules/conversationContextHandler.js';
import { filterTranscription } from './utils.js';


// URLs for API endpoints
const TRANSCRIPTION_WHISPER_API_URL = "http://localhost:3000/transcribe/whisper";
const TRANSCRIBE_ASSEMBLYAI_API_URL = "http://localhost:3000/transcribe/assemblyai";
const SUGGESTIONS_API_URL = "http://localhost:3000/suggestions";
const SUMMARY_API_URL = "http://localhost:3000/summary";


// Initialize handlers
const audioCapture = new AudioCapture();
const transcriptionHandler = new TranscriptionHandler(TRANSCRIPTION_WHISPER_API_URL);
const uiHandler = new UIHandler();
const suggestionsHandler = new SuggestionsHandler(SUGGESTIONS_API_URL);
const conversationContextHandler = new ConversationContextHandler(SUMMARY_API_URL);

// Current language selection
let currentLanguage = uiHandler.defaultLang;

// Function to handle system audio capture
async function handleSystemCapture() {
  if (!audioCapture.isSystemRecording) {
    await audioCapture.startSystemCapture();
    uiHandler.toggleCaptureButton('system', true);
    await startTranscription('system');
  } else {
    audioCapture.stopSystemCapture();
    uiHandler.toggleCaptureButton('system', false);
  }
}

// Function to handle microphone capture
async function handleMicCapture() {
  if (!audioCapture.isMicRecording) {
    await audioCapture.startMicCapture();
    uiHandler.toggleCaptureButton('mic', true);
    await startTranscription('mic');
  } else {
    audioCapture.stopMicCapture();
    uiHandler.toggleCaptureButton('mic', false);
  }
}

// Function to start transcription for a specific source
async function startTranscription(source) {
  const intervalId = setInterval(async () => {
    const buffer = source === 'system' ? audioCapture.systemBuffer : audioCapture.micBuffer;
    const contextLabel = source === 'system' ? 'System' : 'Mic';

    if (buffer.length > 0) {
      const audioBuffer = buffer.reduce((acc, val) => {
        const tmp = new Float32Array(acc.length + val.length);
        tmp.set(acc, 0);
        tmp.set(val, acc.length);
        return tmp;
      }, new Float32Array());

      const wavBlob = transcriptionHandler.bufferToWaveBlob(audioBuffer, 44100);
      buffer.length = 0; // Clear buffer

      const transcription = await transcriptionHandler.transcribeAudio(wavBlob, currentLanguage);
      if (transcription) {
        console.log(`Transcription (${contextLabel}):`, transcription);
        const filteredText = filterTranscription(transcription);
        if(filteredText === "") return;
        conversationContextHandler.conversationContextDialogs.push({speaker: contextLabel, text: filteredText, time: Date.now(), language: currentLanguage, source: source});
        await conversationContextHandler.updateConversationContext();
        uiHandler.updateTranscription(conversationContextHandler.conversationContextText);
      }
    }
  }, audioCapture.timeslice);

  if (source === 'system') {
    audioCapture.systemTranscriptionInterval = intervalId;
  } else {
    audioCapture.micTranscriptionInterval = intervalId;
  }
}

// Function to generate suggestions
async function handleGenerateSuggestions() {
  const context = conversationContextHandler.conversationContextText;
  const suggestions = await suggestionsHandler.generateSuggestions(context);
  uiHandler.updateSuggestions(suggestions);
}

function handleAddMeetingInfos() {
  uiHandler.populateMeetingModal();
}
function handleCloseMeetingInfos() {
  uiHandler.closeMeetingModal();
}
function handleSaveMeetingInfos() {
  const values =  uiHandler.meetingsInfosLabels.map(key => {
    const input = document.getElementById(`input-${key}`);
    return input.value.trim();
  });
  conversationContextHandler.conversationContextMeetingInfosText =  uiHandler.meetingsInfosLabels.map((key, index) => `* ${key} : ${values[index]}`).join("\n");
  console.log("Détails de la réunion :\n", conversationContextHandler.conversationContextMeetingInfosText);

  uiHandler.closeMeetingModal();
}

// Function to handle language change
function handleLanguageChange(newLang) {
  currentLanguage = newLang;
}

function applyTranslations(lang) {
  uiHandler.translateUI(lang);
  conversationContextHandler.translateContext(lang);
}

// Initialize UI and attach event listeners
uiHandler.initialize(handleLanguageChange);
uiHandler.attachCaptureEventListeners(handleSystemCapture, handleMicCapture);
uiHandler.attachSuggestionEventListeners(handleGenerateSuggestions);
uiHandler.attachMeetingInfosEventListeners(handleAddMeetingInfos, handleCloseMeetingInfos, handleSaveMeetingInfos);
uiHandler.initializeKeydownEventListeners();
