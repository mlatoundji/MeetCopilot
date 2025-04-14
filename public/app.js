import { AudioCapture } from './modules/audioCapture.js';
import { TranscriptionHandler } from './modules/transcriptionHandler.js';
import { UIHandler } from './modules/uiHandler.js';
import { SuggestionsHandler } from './modules/suggestionsHandler.js';
import { ConversationContextHandler } from './modules/conversationContextHandler.js';
import { filterTranscription } from './utils.js';
import { UI } from './modules/ui.js';
import { MeetingManager } from './modules/meeting-manager.js';
import { TranscriptionManager } from './modules/transcription-manager.js';
import { SuggestionManager } from './modules/suggestion-manager.js';


// URLs for API endpoints
const TRANSCRIBE_WHISPER_API_URL = "http://localhost:3000/transcribe/whisper";
const TRANSCRIBE_ASSEMBLYAI_API_URL = "http://localhost:3000/transcribe/assemblyai";
const SUGGESTIONS_MISTRAL_API_URL = "http://localhost:3000/suggestions/mistral";
const SUGGESTIONS_LOCAL_API_URL = "http://localhost:3000/suggestions/local";
const SUGGESTIONS_OPENAI_API_URL = "http://localhost:3000/suggestions/openai";
const SUMMARY_MISTRAL_API_URL = "http://localhost:3000/summary/mistral";
const SUMMARY_LOCAL_API_URL = "http://localhost:3000/summary/local";

const SYSTEM_SOURCE = 'system';
const MIC_SOURCE = 'mic';


// Initialize handlers
const audioCapture = new AudioCapture();
const uiHandler = new UIHandler();
const transcriptionHandler = new TranscriptionHandler(TRANSCRIBE_ASSEMBLYAI_API_URL);
const suggestionsHandler = new SuggestionsHandler(SUGGESTIONS_LOCAL_API_URL);
const conversationContextHandler = new ConversationContextHandler(SUMMARY_LOCAL_API_URL);

// Current language selection
let currentLanguage = uiHandler.defaultLang;

// Function to handle system audio capture
async function handleSystemCapture() {
  if (!audioCapture.isSystemRecording) {
    // conversationContextHandler.resetConversationContext();
    conversationContextHandler.lastSummaryTime = Date.now();
    await audioCapture.startSystemCapture();
    uiHandler.toggleCaptureButton(SYSTEM_SOURCE, true);
    uiHandler.populateVideoElement(audioCapture.systemMediaStream);
    await startTranscription(SYSTEM_SOURCE);
  } else {
    audioCapture.stopSystemCapture();
    uiHandler.toggleCaptureButton(SYSTEM_SOURCE, false);
    uiHandler.closeVideoElement();
  }
}

// Function to handle microphone capture
async function handleMicCapture() {
  if (!audioCapture.isMicRecording) {
    await audioCapture.startMicCapture();
    uiHandler.toggleCaptureButton(MIC_SOURCE, true);
    await startTranscription(MIC_SOURCE);
  } else {
    audioCapture.stopMicCapture();
    uiHandler.toggleCaptureButton(MIC_SOURCE, false);
  }
}

// Function to start transcription for a specific source
async function startTranscription(source) {
  const intervalId = setInterval(async () => {
    const buffer = source === SYSTEM_SOURCE ? audioCapture.systemBuffer : audioCapture.micBuffer;
    const contextLabel = source === SYSTEM_SOURCE ? conversationContextHandler.systemLabel : conversationContextHandler.micLabel;

    if (buffer.length > 0) {
      const audioBuffer = buffer.reduce((acc, val) => {
        const tmp = new Float32Array(acc.length + val.length);
        tmp.set(acc, 0);
        tmp.set(val, acc.length);
        return tmp;
      }, new Float32Array());

      const wavBlob = transcriptionHandler.bufferToWaveBlob(audioBuffer, 44100);
      buffer.length = 0; // Clear buffer

      const transcription = await transcriptionHandler.transcribeAudio(wavBlob);
      if (transcription) {
        console.log(`Transcription (${contextLabel}):`, transcription);
        const filteredText = filterTranscription(transcription, currentLanguage);
        if(filteredText === "") return;
        conversationContextHandler.conversationContextDialogs.push({speaker: contextLabel, text: filteredText, time: Date.now(), language: currentLanguage, source: source});
        await conversationContextHandler.updateConversationContext();
        uiHandler.updateTranscription(conversationContextHandler.conversationContextText);
      }
    }
  }, audioCapture.timeslice);

  if (source === SYSTEM_SOURCE) {
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
  let details =  uiHandler.meetingsInfosLabels.map((key, index) => `* ${key} : ${values[index]}`).join("\n");
  conversationContextHandler.updateMeetingInfosText(details);
  conversationContextHandler.updateConversationContextHeadersText();
  console.log("Meetings details :\n", conversationContextHandler.conversationContextMeetingInfosText);

  uiHandler.closeMeetingModal();
}

// Function to handle language change
function handleLanguageChange(newLang) {
  currentLanguage = newLang;
  applyTranslations(currentLanguage);
}

function applyTranslations(lang) {
  uiHandler.translateUI(lang);
  conversationContextHandler.translateContext(lang);
  transcriptionHandler.applyTranslation(lang);
}

// Initialize UI and attach event listeners
uiHandler.initialize(handleLanguageChange);
uiHandler.attachCaptureEventListeners(handleSystemCapture, handleMicCapture);
uiHandler.attachSuggestionEventListeners(handleGenerateSuggestions);
uiHandler.attachMeetingInfosEventListeners(handleAddMeetingInfos, handleCloseMeetingInfos, handleSaveMeetingInfos);
uiHandler.initializeKeydownEventListeners();

class App {
  constructor() {
    this.ui = new UI();
    this.meetingManager = new MeetingManager();
    this.transcriptionManager = new TranscriptionManager();
    this.suggestionManager = new SuggestionManager();
    
    this.setupEventListeners();
    this.loadInitialData();
  }

  setupEventListeners() {
    // System capture button
    document.getElementById('systemCaptureButton').addEventListener('click', () => {
      this.meetingManager.toggleSystemCapture();
    });

    // Mic capture button
    document.getElementById('micCaptureButton').addEventListener('click', () => {
      this.meetingManager.toggleMicCapture();
    });

    // Suggestion button
    document.getElementById('suggestionButton').addEventListener('click', () => {
      this.suggestionManager.generateSuggestions();
    });

    // Add meeting info button
    document.getElementById('addMeetingInfosButton').addEventListener('click', () => {
      this.meetingManager.showMeetingInfoModal();
    });

    // Save meeting info button
    document.getElementById('saveMeetingInfosButton').addEventListener('click', () => {
      this.meetingManager.saveMeetingInfo();
    });

    // Close meeting info button
    document.getElementById('closeMeetingInfosButton').addEventListener('click', () => {
      this.meetingManager.closeMeetingInfoModal();
    });

    // Language selection
    document.getElementById('langSelect').addEventListener('change', (e) => {
      this.transcriptionManager.setLanguage(e.target.value);
    });

    // Search functionality
    const searchInput = document.querySelector('.search-input');
    const searchButton = document.querySelector('.search-button');
    if (searchInput && searchButton) {
      searchButton.addEventListener('click', () => {
        this.searchMeetings(searchInput.value);
      });
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.searchMeetings(searchInput.value);
        }
      });
    }

    // Audio input selection
    const audioInputSelect = document.getElementById('audioInputSelect');
    if (audioInputSelect) {
      audioInputSelect.addEventListener('change', (e) => {
        this.meetingManager.setAudioInput(e.target.value);
      });
    }
  }

  async loadInitialData() {
    try {
      // Load available languages
      const languages = await this.transcriptionManager.getAvailableLanguages();
      this.populateLanguageDropdown(languages);

      // Load audio input devices
      const devices = await this.meetingManager.getAudioInputDevices();
      this.populateAudioInputDevices(devices);

      // Load recent meetings
      const recentMeetings = await this.meetingManager.getRecentMeetings();
      this.populateRecentMeetings(recentMeetings);

      // Load dashboard statistics
      const stats = await this.meetingManager.getMeetingStatistics();
      this.populateDashboardStats(stats);
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.ui.showNotification('Error loading initial data', 'error');
    }
  }

  populateLanguageDropdown(languages) {
    const langSelect = document.getElementById('langSelect');
    if (langSelect) {
      languages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.code;
        option.textContent = lang.name;
        langSelect.appendChild(option);
      });
    }
  }

  populateAudioInputDevices(devices) {
    const audioInputSelect = document.getElementById('audioInputSelect');
    if (audioInputSelect) {
      devices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `Device ${device.deviceId}`;
        audioInputSelect.appendChild(option);
      });
    }
  }

  populateRecentMeetings(meetings) {
    const meetingsList = document.querySelector('.meetings-list');
    if (meetingsList) {
      meetingsList.innerHTML = meetings.map(meeting => `
        <div class="meeting-item">
          <h4>${meeting.title}</h4>
          <p>${new Date(meeting.date).toLocaleDateString()}</p>
          <button class="button" onclick="app.viewMeeting('${meeting.id}')">View</button>
        </div>
      `).join('');
    }
  }

  populateDashboardStats(stats) {
    const statsContent = document.querySelector('.stats-content');
    if (statsContent) {
      statsContent.innerHTML = `
        <div class="stat-item">
          <span class="stat-label">Total Meetings</span>
          <span class="stat-value">${stats.totalMeetings}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Total Duration</span>
          <span class="stat-value">${this.formatDuration(stats.totalDuration)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Average Duration</span>
          <span class="stat-value">${this.formatDuration(stats.averageDuration)}</span>
        </div>
      `;
    }
  }

  formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  async searchMeetings(query) {
    try {
      const results = await this.meetingManager.searchMeetings(query);
      this.populateRecentMeetings(results);
    } catch (error) {
      console.error('Error searching meetings:', error);
      this.ui.showNotification('Error searching meetings', 'error');
    }
  }

  async viewMeeting(meetingId) {
    try {
      const meeting = await this.meetingManager.getMeetingDetails(meetingId);
      // Switch to history tab and display meeting details
      document.querySelector('[data-tab="history"]').click();
      // TODO: Implement meeting details view
    } catch (error) {
      console.error('Error viewing meeting:', error);
      this.ui.showNotification('Error viewing meeting', 'error');
    }
  }
}

// Initialize the app
const app = new App();
window.app = app; // Make app available globally for debugging
