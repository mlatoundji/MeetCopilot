import { AudioCapture } from './modules/audioCapture.js';
import { TranscriptionHandler } from './modules/transcriptionHandler.js';
import { UIHandler } from './modules/uiHandler.js';
import { SuggestionsHandler } from './modules/suggestionsHandler.js';
import { ConversationContextHandler } from './modules/conversationContextHandler.js';
import { Router } from './modules/Router.js';
import { filterTranscription } from './utils.js';
import { UI } from './modules/ui.js';
import { BackupHandler } from './modules/backupHandler.js';

// URLs for API endpoints
const TRANSCRIBE_WHISPER_API_URL = "http://localhost:3000/transcribe/whisper";
const TRANSCRIBE_ASSEMBLYAI_API_URL = "http://localhost:3000/transcribe/assemblyai";
const SUGGESTIONS_MISTRAL_API_URL = "http://localhost:3000/suggestions/mistral";
const SUGGESTIONS_LOCAL_API_URL = "http://localhost:3000/suggestions/local";
const SUGGESTIONS_OPENAI_API_URL = "http://localhost:3000/suggestions/openai";
const SUMMARY_MISTRAL_API_URL = "http://localhost:3000/summary/mistral";
const SUMMARY_LOCAL_API_URL = "http://localhost:3000/summary/local";
const MEETINGS_API_URL = "http://localhost:3000/api/meetings";

const SYSTEM_SOURCE = 'system';
const MIC_SOURCE = 'mic';

class App {
  constructor() {
    // Initialize UI
    this.ui = new UI();
    
    // API URLs
    this.MEETINGS_API_URL = MEETINGS_API_URL;
    
    // Initialize handlers
    this.audioCapture = new AudioCapture();
    this.uiHandler = new UIHandler();
    this.transcriptionHandler = new TranscriptionHandler(TRANSCRIBE_ASSEMBLYAI_API_URL);
    this.suggestionsHandler = new SuggestionsHandler(SUGGESTIONS_MISTRAL_API_URL);
    this.conversationContextHandler = new ConversationContextHandler(SUMMARY_MISTRAL_API_URL);

    this.backupHandler = new BackupHandler(MEETINGS_API_URL, this);
    
    // Current language
    this.currentLanguage = this.uiHandler.defaultLang;
    
    this.sessionActive = false;
    this.dashboardTab = document.querySelector('[data-tab="dashboard"]');
    this.currentMeetingTab = document.querySelector('[data-tab="current-meeting"]');

    this.meetingInfos = {};

    this.saveMeetingInfosButton = document.getElementById('saveMeetingInfosButton');
    this.closeMeetingInfosButton = document.getElementById('closeMeetingInfosButton');
    this.langSelect = document.getElementById('langSelect');
    
    this.loadInitialData();
    
    // Initialiser le routeur après que tout soit chargé
    this.initializeRouter();
  }
  
  initializeRouter() {
    this.router = new Router(this);
  }

  setupEventListeners() {

    // Utilisation de la délégation d'événements pour le bouton de démarrage de session
    document.addEventListener('click', async (e) => {
      if (e.target && e.target.id === 'startSessionButton') {
        await this.handleStartSession();
      }
    });

    

    // Save meeting info button
    this.saveMeetingInfosButton.addEventListener('click', () => {
      this.handleSaveMeetingInfos();
    });

    // Close meeting info button
    this.closeMeetingInfosButton.addEventListener('click', () => {
      this.handleCloseMeetingInfos();
    });

    // Language selection
    this.langSelect.addEventListener('change', (e) => {
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

    // Sidebar nav links
    document.addEventListener('click', (e) => {
      const button = e.target.closest('.sidebar-link');
      if (button) {
        const hash = button.getAttribute('data-hash');
        if (hash) {
          window.location.hash = hash;
        }
      }
    });
  }

  async handleSessionControl() {
    await this.uiHandler.populateMeetingModal();
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
        
        // Mettre à jour l'interface utilisateur via le router si nécessaire
        if (this.router && this.router.currentPage && this.router.currentPage.updateButtonStates) {
          this.router.currentPage.updateButtonStates();
        }
      } catch (error) {
        console.error('Error starting system capture:', error);
        // En cas d'erreur, on s'assure que le bouton reste dans son état initial
        this.uiHandler.toggleCaptureButton(SYSTEM_SOURCE, false);
      }
    } else {
      this.audioCapture.stopSystemCapture();
      this.uiHandler.toggleCaptureButton(SYSTEM_SOURCE, false);
      this.uiHandler.closeVideoElement();
      
      // Mettre à jour l'interface utilisateur via le router si nécessaire
      if (this.router && this.router.currentPage && this.router.currentPage.updateButtonStates) {
        this.router.currentPage.updateButtonStates();
      }
    }
  }

  // Function to handle microphone capture
  async handleMicCapture() {
    if (!this.audioCapture.isMicRecording) {
      await this.audioCapture.startMicCapture();
      this.uiHandler.toggleCaptureButton(MIC_SOURCE, true);
      await this.startTranscription(MIC_SOURCE);
      
      // Mettre à jour l'interface utilisateur via le router si nécessaire
      if (this.router && this.router.currentPage && this.router.currentPage.updateButtonStates) {
        this.router.currentPage.updateButtonStates();
      }
    } else {
      this.audioCapture.stopMicCapture();
      this.uiHandler.toggleCaptureButton(MIC_SOURCE, false);
      
      // Mettre à jour l'interface utilisateur via le router si nécessaire
      if (this.router && this.router.currentPage && this.router.currentPage.updateButtonStates) {
        this.router.currentPage.updateButtonStates();
      }
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
    this.conversationContextHandler.conversationContextSuggestions.push({
      text: suggestions,
      time: Date.now(),
      language: this.currentLanguage
    });

  }

  // Functions to handle meeting info modals
  handleCloseMeetingInfos() {
    this.uiHandler.closeMeetingModal();
  }
  
  async handleSaveMeetingInfos() {
    const values = this.uiHandler.meetingsInfosLabels.map(key => {
      const input = document.getElementById(`input-${key}`);
      return input.value.trim();
    });
    this.meetingInfos = this.uiHandler.meetingsInfosLabels.map((key, index) => ({
      [key]: values[index]
    }));
    let details = Object.entries(this.meetingInfos).map(([key, value]) => `* ${key} : ${value}`).join("\n");
    this.conversationContextHandler.updateMeetingInfosText(details);
    this.conversationContextHandler.updateConversationContextHeadersText();
    console.log("Meetings details :\n", this.conversationContextHandler.conversationContextMeetingInfosText);
    
    // Fermer la modale
    this.uiHandler.closeMeetingModal();
    
    // Démarrer la session
    await this.startSession();
  }

  async handleStartSession() {
    if (this.uiHandler.mode === 'assiste') {
      // Basculer vers l'onglet réunion si en mode assisté
      const tabs = this.uiHandler.dynamicFields.querySelectorAll('.modal-tab');
      tabs.forEach(t => t.classList.remove('active'));
      this.uiHandler.dynamicFields.querySelector('[data-tab-modal="meeting"]').classList.add('active');
      
      this.uiHandler.dynamicFields.querySelectorAll('.tab-content-modal').forEach(content => {
          content.classList.remove('active');
      });
      document.getElementById('meeting-tab').classList.add('active');
      
      // Afficher le bouton de sauvegarde
      if (this.saveMeetingInfosButton) {
          this.saveMeetingInfosButton.style.display = 'block';
      }
  } else {
    // Fermer la modale
    this.uiHandler.closeMeetingModal();
    
    // Démarrer la session
    await this.startSession();
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
    
    // Mettre à jour l'interface utilisateur via le router si nécessaire
    if (this.router && this.router.currentPage) {
      this.router.currentPage.render();
    }
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
      
      // Configuration des écouteurs d'événements
      this.setupEventListeners();
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

  async startSession() {
    this.sessionActive = true;

    this.backupHandler.initializeMeeting(this.meetingInfos);

    
    // Naviguer vers la page de réunion
    this.router.navigateTo('meeting');
    
    // Démarrer les captures audio
    // if (!this.audioCapture.isSystemRecording) {
    //   await this.handleSystemCapture();
    // }
    // if (!this.audioCapture.isMicRecording) {
    //   await this.handleMicCapture();
    // }
    


    // Mettre à jour l'interface utilisateur via le router si nécessaire
    if (this.router && this.router.currentPage && this.router.currentPage.updateButtonStates) {
      this.router.currentPage.render();
      this.router.currentPage.updateButtonStates();
    }

  }

  stopSession() {
    this.sessionActive = false;
    
    // Arrêter les captures audio
    if (this.audioCapture.isSystemRecording) {
      this.audioCapture.stopSystemCapture();
      this.uiHandler.toggleCaptureButton(SYSTEM_SOURCE, false);
      this.uiHandler.closeVideoElement();
    }
    
    if (this.audioCapture.isMicRecording) {
      this.audioCapture.stopMicCapture();
      this.uiHandler.toggleCaptureButton(MIC_SOURCE, false);
    }
    
    // Naviguer vers la page d'accueil
    this.router.navigateTo('home');
    
    // Mettre à jour l'interface utilisateur
    if (this.router.currentPage) {
      this.router.currentPage.render();
    }
  }
}

// Initialize the app
const app = new App();
window.app = app; // Make app available globally for debugging
