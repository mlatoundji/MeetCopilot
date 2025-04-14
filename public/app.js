import { AudioCapture } from './modules/audioCapture.js';
import { TranscriptionHandler } from './modules/transcriptionHandler.js';
import { UIHandler } from './modules/uiHandler.js';
import { SuggestionsHandler } from './modules/suggestionsHandler.js';
import { ConversationContextHandler } from './modules/conversationContextHandler.js';
import { filterTranscription } from './utils.js';
import { UI } from './modules/ui.js';

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

class App {
  constructor() {
    // Initialize UI
    this.ui = new UI();
    
    // Initialize handlers
    this.audioCapture = new AudioCapture();
    this.uiHandler = new UIHandler();
    this.transcriptionHandler = new TranscriptionHandler(TRANSCRIBE_ASSEMBLYAI_API_URL);
    this.suggestionsHandler = new SuggestionsHandler(SUGGESTIONS_MISTRAL_API_URL);
    this.conversationContextHandler = new ConversationContextHandler(SUMMARY_MISTRAL_API_URL);
    
    // Current language
    this.currentLanguage = this.uiHandler.defaultLang;
    
    this.setupEventListeners();
    this.loadInitialData();
  }

  setupEventListeners() {
    // System capture button
    document.getElementById('systemCaptureButton').addEventListener('click', () => {
      this.handleSystemCapture();
    });

    // Mic capture button
    document.getElementById('micCaptureButton').addEventListener('click', () => {
      this.handleMicCapture();
    });

    // Suggestion button
    document.getElementById('suggestionButton').addEventListener('click', () => {
      this.handleGenerateSuggestions();
    });

    // Add meeting info button
    document.getElementById('addMeetingInfosButton').addEventListener('click', () => {
      this.handleAddMeetingInfos();
    });

    // Save meeting info button
    document.getElementById('saveMeetingInfosButton').addEventListener('click', () => {
      this.handleSaveMeetingInfos();
    });

    // Close meeting info button
    document.getElementById('closeMeetingInfosButton').addEventListener('click', () => {
      this.handleCloseMeetingInfos();
    });

    // Language selection
    document.getElementById('langSelect').addEventListener('change', (e) => {
      this.handleLanguageChange(e.target.value);
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

    // Initialize key event listeners
    this.uiHandler.initializeKeydownEventListeners();
  }

  // Function to handle system audio capture
  async handleSystemCapture() {
    if (!this.audioCapture.isSystemRecording) {
      try {
        this.conversationContextHandler.resetConversationContext();
        this.conversationContextHandler.lastSummaryTime = Date.now();
        const started = await this.audioCapture.startSystemCapture();
        if (!started) {
          // Si la capture n'a pas démarré (annulation), on ne fait rien
          return;
        }
        this.uiHandler.toggleCaptureButton(SYSTEM_SOURCE, true);
        this.uiHandler.populateVideoElement(this.audioCapture.systemMediaStream);
        await this.startTranscription(SYSTEM_SOURCE);
      } catch (error) {
        console.error('Error starting system capture:', error);
        // En cas d'erreur, on s'assure que le bouton reste dans son état initial
        this.uiHandler.toggleCaptureButton(SYSTEM_SOURCE, false);
      }
    } else {
      this.audioCapture.stopSystemCapture();
      this.uiHandler.toggleCaptureButton(SYSTEM_SOURCE, false);
      this.uiHandler.closeVideoElement();
    }
  }

  // Function to handle microphone capture
  async handleMicCapture() {
    if (!this.audioCapture.isMicRecording) {
      await this.audioCapture.startMicCapture();
      this.uiHandler.toggleCaptureButton(MIC_SOURCE, true);
      await this.startTranscription(MIC_SOURCE);
    } else {
      this.audioCapture.stopMicCapture();
      this.uiHandler.toggleCaptureButton(MIC_SOURCE, false);
    }
  }

  // Function to start transcription for a specific source
  async startTranscription(source) {
    const intervalId = setInterval(async () => {
      const buffer = source === SYSTEM_SOURCE ? this.audioCapture.systemBuffer : this.audioCapture.micBuffer;
      const contextLabel = source === SYSTEM_SOURCE ? this.conversationContextHandler.systemLabel : this.conversationContextHandler.micLabel;

      if (buffer.length > 0) {
        const audioBuffer = buffer.reduce((acc, val) => {
          const tmp = new Float32Array(acc.length + val.length);
          tmp.set(acc, 0);
          tmp.set(val, acc.length);
          return tmp;
        }, new Float32Array());

        const wavBlob = this.transcriptionHandler.bufferToWaveBlob(audioBuffer, 44100);
        buffer.length = 0; // Clear buffer

        const transcription = await this.transcriptionHandler.transcribeAudio(wavBlob);
        if (transcription) {
          console.log(`Transcription (${contextLabel}):`, transcription);
          const filteredText = filterTranscription(transcription, this.currentLanguage);
          if(filteredText === "") return;
          this.conversationContextHandler.conversationContextDialogs.push({
            speaker: contextLabel, 
            text: filteredText, 
            time: Date.now(), 
            language: this.currentLanguage, 
            source: source
          });
          await this.conversationContextHandler.updateConversationContext();
          this.uiHandler.updateTranscription(this.conversationContextHandler.conversationContextText);
        }
      }
    }, this.audioCapture.timeslice);

    if (source === SYSTEM_SOURCE) {
      this.audioCapture.systemTranscriptionInterval = intervalId;
    } else {
      this.audioCapture.micTranscriptionInterval = intervalId;
    }
  }

  // Function to generate suggestions
  async handleGenerateSuggestions() {
    const context = this.conversationContextHandler.conversationContextText;
    const suggestions = await this.suggestionsHandler.generateSuggestions(context);
    this.uiHandler.updateSuggestions(suggestions);
  }

  // Functions to handle meeting info modals
  handleAddMeetingInfos() {
    this.uiHandler.populateMeetingModal();
  }
  
  handleCloseMeetingInfos() {
    this.uiHandler.closeMeetingModal();
  }
  
  async handleSaveMeetingInfos() {
    const values = this.uiHandler.meetingsInfosLabels.map(key => {
      const input = document.getElementById(`input-${key}`);
      return input.value.trim();
    });
    let details = this.uiHandler.meetingsInfosLabels.map((key, index) => `* ${key} : ${values[index]}`).join("\n");
    this.conversationContextHandler.updateMeetingInfosText(details);
    this.conversationContextHandler.updateConversationContextHeadersText();
    console.log("Meetings details :\n", this.conversationContextHandler.conversationContextMeetingInfosText);
    
    // En fonction du mode, démarrer la session appropriée
    const mode = this.uiHandler.getMode();
    console.log("Mode de session :", mode);
    
    // Fermer la modale
    this.uiHandler.closeMeetingModal();
    
    // Si nous sommes en mode assisté, démarrer automatiquement la capture système
    if (mode === 'assiste') {
      // Si nous n'avons pas encore commencé l'enregistrement, le lancer
      if (!this.audioCapture.isSystemRecording) {
        this.handleSystemCapture();
      }
    }
  }

  // Function to handle language change
  handleLanguageChange(newLang) {
    this.currentLanguage = newLang;
    this.applyTranslations(this.currentLanguage);
  }

  applyTranslations(lang) {
    this.uiHandler.translateUI(lang);
    this.conversationContextHandler.translateContext(lang);
    this.transcriptionHandler.applyTranslation(lang);
  }

  async loadInitialData() {
    try {
      // Initialize UI with language selection
      this.uiHandler.initialize((newLang) => {
        this.handleLanguageChange(newLang);
      });
      
      // Apply initial translations
      this.applyTranslations(this.currentLanguage);
      
      // Populate UI placeholder text
      this.uiHandler.updateTranscription(this.uiHandler.selectedTranslations.transcriptionPlaceholder);
      this.uiHandler.updateSuggestions(this.uiHandler.selectedTranslations.suggestionsPlaceholder);
    } catch (error) {
      console.error('Error loading initial data:', error);
      // Show error notification if available
      if (this.ui.showNotification) {
        this.ui.showNotification('Error loading initial data', 'error');
      }
    }
  }

  async searchMeetings(query) {
    try {
      // This would be implemented to search meetings in a real database
      console.log('Searching for meetings with query:', query);
      // For now, we'll just log the query
    } catch (error) {
      console.error('Error searching meetings:', error);
      if (this.ui.showNotification) {
        this.ui.showNotification('Error searching meetings', 'error');
      }
    }
  }
}

// Initialize the app
const app = new App();
window.app = app; // Make app available globally for debugging
