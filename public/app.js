import { AudioCapture } from './modules/audioCapture.js';
import { TranscriptionHandler } from './modules/transcriptionHandler.js';
import { UIHandler } from './modules/uiHandler.js';
import { SuggestionsHandler } from './modules/suggestionsHandler.js';
import { ConversationContextHandler } from './modules/conversationContextHandler.js';
import { Router } from './modules/Router.js';
import { filterTranscription } from './utils.js';
import { UI } from './modules/ui.js';
import { BackupHandler } from './modules/backupHandler.js';
import { APIHandler } from './modules/apiHandler.js';
import { DataStore } from './modules/dataStore.js';
import { HomePageHistory } from './pages/js/HomePageHistory.js';

const SYSTEM_SOURCE = 'system';
const MIC_SOURCE = 'mic';

class App {
  constructor() {
    // Initialize API Handler first
    this.apiHandler = new APIHandler();
    
    // Déterminer l'URL des réunions sur la base de l'APIHandler
    let MEETINGS_API_URL = `${this.apiHandler.baseURL}/api/meetings`;
    
    // Initialize handlers that depend on API
    this.audioCapture = new AudioCapture();
    this.uiHandler = new UIHandler();
    this.dataStore = new DataStore(this.apiHandler);
    this.transcriptionHandler = new TranscriptionHandler(this.apiHandler);
    this.suggestionsHandler = new SuggestionsHandler(this.apiHandler);
    this.conversationContextHandler = new ConversationContextHandler(this.apiHandler);
    this.backupHandler = new BackupHandler(this, this.apiHandler);
    this.ui = new UI();
    
    // Set up router
    this.router = new Router(this);
    this.router.initialize();

    // Current app state
    this.filterTranscription = filterTranscription;
    this.currentLanguage = 'fr';
    this.useSilenceMode = true; // toggle between interval and silence-detection modes

    // API URLs
    this.MEETINGS_API_URL = MEETINGS_API_URL;
    
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
    this.isListenersAttached = false;
  }
  
  initializeRouter() {
    // Initialize the existing router instance
    if (this.router) {
      this.router.initialize();
    }
  }

  setupEventListeners() {

    // Utilisation de la délégation d'événements pour le bouton de démarrage de session
    document.addEventListener('click', async (e) => {
      if (e.target && e.target.id === 'startSessionButton') {
        await this.handleStartSession();
      }
    });

    

    if (this.saveMeetingInfosButton) {
      this.saveMeetingInfosButton.addEventListener('click', () => {
        this.handleSaveMeetingInfos();
      });
    }
    if (this.closeMeetingInfosButton) {
      this.closeMeetingInfosButton.addEventListener('click', () => {
        this.handleCloseMeetingInfos();
      });
    }

    if (this.langSelect) {
      this.langSelect.addEventListener('change', (e) => {
        this.handleLanguageChange(e.target.value);
      });
    }

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

    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const nav = item.getAttribute('data-nav');
        this.loadFragment(nav);
      });
    });
  }

  async handleSessionControl() {
    await this.uiHandler.populateMeetingModal();
  }
  // Function to handle system audio capture
  async handleSystemCapture() {
    if (!this.audioCapture.isSystemRecording) {
      try {
        // this.conversationContextHandler.resetConversationContext();
        this.conversationContextHandler.lastSummaryTime = Date.now();
        const started = await this.audioCapture.startSystemCapture();
        if (!started) {
          // Si la capture n'a pas démarré (annulation), on ne fait rien
          return;
        }
        this.uiHandler.toggleCaptureButton(SYSTEM_SOURCE, true);
        this.uiHandler.populateVideoElement(this.audioCapture.systemMediaStream);
        if (this.useSilenceMode) {
          console.log("Using silence mode");
          // Register event-driven utterance callbacks
          this.audioCapture.onUtteranceStart = (src) => {
            console.log(`Utterance started for source: ${src}`);
          };
          this.audioCapture.onUtteranceEnd = async (src, audioBuffer) => {
            console.log(`Utterance ended for source: ${src}`);
            const contextLabel = src === SYSTEM_SOURCE ? this.conversationContextHandler.systemLabel : this.conversationContextHandler.micLabel;
            const wavBlob = this.transcriptionHandler.bufferToWaveBlob(audioBuffer, 44100);
            const transcription = await this.transcriptionHandler.transcribeAudio(wavBlob);
            if (transcription) {
              console.log(`Transcription (${contextLabel}):`, transcription);
              const filteredText = this.filterTranscription(transcription, this.currentLanguage);
              if (filteredText) {
                this.conversationContextHandler.conversationContextDialogs.push({ speaker: contextLabel, text: filteredText, time: Date.now(), language: this.currentLanguage, source: src });
                // Enqueue for backend
                console.log("Unsent messages", this.conversationContextHandler.unsentMessages);
                if(this.conversationContextHandler.unsentMessages){
                  console.log("Enqueueing unsent messages", this.conversationContextHandler.unsentMessages);
                  this.conversationContextHandler.unsentMessages.push({ role: contextLabel === this.conversationContextHandler.micLabel ? 'user' : 'assistant', content: filteredText });
                }
                await this.conversationContextHandler.updateConversationContext();
                this.uiHandler.updateTranscription(this.conversationContextHandler.conversationContextText);
              }
            }
          };
        } else {
          await this.startTranscription(SYSTEM_SOURCE);
        }
        
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
      
      // Clear event-driven utterance callbacks
      this.audioCapture.onUtteranceStart = null;
      this.audioCapture.onUtteranceEnd = null;
      
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
      if (this.useSilenceMode) {
        this.audioCapture.onUtteranceStart = (src) => {
          console.log(`Utterance started for source: ${src}`);
        };
        this.audioCapture.onUtteranceEnd = async (src, audioBuffer) => {
          console.log(`Utterance ended for source: ${src}`);
          const contextLabel = src === SYSTEM_SOURCE ? this.conversationContextHandler.systemLabel : this.conversationContextHandler.micLabel;
          const wavBlob = this.transcriptionHandler.bufferToWaveBlob(audioBuffer, 44100);
          const transcription = await this.transcriptionHandler.transcribeAudio(wavBlob);
          if (transcription) {
            console.log(`Transcription (${contextLabel}):`, transcription);
            const filteredText = this.filterTranscription(transcription, this.currentLanguage);
            if (filteredText) {
              this.conversationContextHandler.conversationContextDialogs.push({ speaker: contextLabel, text: filteredText, time: Date.now(), language: this.currentLanguage, source: src });
              // Enqueue for backend
              if(this.conversationContextHandler.unsentMessages){
                this.conversationContextHandler.unsentMessages.push({ role: contextLabel === this.conversationContextHandler.micLabel ? 'user' : 'assistant', content: filteredText });
              }
              await this.conversationContextHandler.updateConversationContext();
              this.uiHandler.updateTranscription(this.conversationContextHandler.conversationContextText);
            }
          }
        };
      } else {
        await this.startTranscription(MIC_SOURCE);
      }
      
      // Mettre à jour l'interface utilisateur via le router si nécessaire
      if (this.router && this.router.currentPage && this.router.currentPage.updateButtonStates) {
        this.router.currentPage.updateButtonStates();
      }
    } else {
      this.audioCapture.stopMicCapture();
      this.uiHandler.toggleCaptureButton(MIC_SOURCE, false);
      
      // Clear event-driven utterance callbacks
      this.audioCapture.onUtteranceStart = null;
      this.audioCapture.onUtteranceEnd = null;
      
      // Mettre à jour l'interface utilisateur via le router si nécessaire
      if (this.router && this.router.currentPage && this.router.currentPage.updateButtonStates) {
        this.router.currentPage.updateButtonStates();
      }
    }
  }

  // Function to start transcription for a specific source
  async startTranscription(source) {
    console.log("Starting transcription for source:", source);
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
          const filteredText = this.filterTranscription(transcription, this.currentLanguage);
          if(filteredText === "") return;
          this.conversationContextHandler.conversationContextDialogs.push({
            speaker: contextLabel, 
            text: filteredText, 
            time: Date.now(), 
            language: this.currentLanguage, 
            source: source
          });
          // Enqueue for backend
          if(this.conversationContextHandler.unsentMessages){
            this.conversationContextHandler.unsentMessages.push({ role: contextLabel === this.conversationContextHandler.micLabel ? 'user' : 'assistant', content: filteredText });
          }
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
    
    // Construct meetingInfos as a single object with key-value pairs
    this.meetingInfos = this.uiHandler.meetingsInfosLabels.reduce((acc, key, index) => {
      acc[key] = values[index];
      return acc;
    }, {});
    
    let details = Object.entries(this.meetingInfos)
      .map(([key, value]) => `* ${key} : ${value}`)
      .join("\n");
    
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
    this.router.navigate('meeting');
    
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
    
    // Clear transcription polling intervals to stop background polling
    if (this.audioCapture.systemTranscriptionInterval) {
      clearInterval(this.audioCapture.systemTranscriptionInterval);
      this.audioCapture.systemTranscriptionInterval = null;
    }
    if (this.audioCapture.micTranscriptionInterval) {
      clearInterval(this.audioCapture.micTranscriptionInterval);
      this.audioCapture.micTranscriptionInterval = null;
    }
    
    // Clear event-driven utterance callbacks
    this.audioCapture.onUtteranceStart = null;
    this.audioCapture.onUtteranceEnd = null;
    
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
    this.router.navigate('home');
    
    // Mettre à jour l'interface utilisateur
    if (this.router.currentPage) {
      this.router.currentPage.render();
    }
  }

  async init() {
    console.log("App initializing");
    this.uiHandler.setupLanguageSwitcher();
    // Attacher le listener du bouton menu/sidebar UNE SEULE FOIS après que le DOM soit prêt
    const collapseBtn = document.getElementById('collapseSidebar');
    const sidebar = document.getElementById('main-sidebar');
    if (collapseBtn && sidebar) {
      collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.innerWidth <= 600) {
          sidebar.classList.toggle('open');
        } else {
          sidebar.classList.toggle('collapsed');
        }
      });
      document.addEventListener('click', (e) => {
        if (window.innerWidth <= 600 && sidebar.classList.contains('open')) {
          if (!sidebar.contains(e.target) && e.target !== collapseBtn) {
            sidebar.classList.remove('open');
          }
        }
      });
    }
    
    // Ajout du listener pour initialiser les pages après leur chargement
    window.addEventListener('pageLoaded', (event) => {
      const pageName = event.detail.page;
      console.log(`Page loaded: ${pageName}`);
      
      let tabKey;
      if (pageName === 'meeting') {
        // Initialiser la page de réunion
        const meetingPage = this.router.getCurrentPage();
        if (meetingPage && typeof meetingPage.initialize === 'function') {
          meetingPage.initialize();
        }
        tabKey = null; // no sidebar tab for meeting
      } else if (pageName === 'home') {
        const homePage = this.router.getCurrentPage();
        if (homePage && typeof homePage.render === 'function') {
          homePage.render();
        }
        tabKey = 'dashboard';
      } else if (pageName === 'history') {
        // For router-based history (if ever)
        tabKey = 'history';
      } else {
        tabKey = null;
      }
      if (tabKey) this.highlightSidebarItem(tabKey);
    });
    
    // Set the initial page based on the current URL or go to home
    const initialPage = this.router.parseLocationUrl() || 'home';
    await this.router.navigate(initialPage);
    
    console.log("App initialized");
  }

  loadFragment(nav) {
    if (nav === 'home' || nav === 'dashboard') {
      if (this.router) {
        this.router.navigate('home');
      }
      this.highlightSidebarItem('dashboard');
      return;
    }
    fetch(`pages/html/${nav}.html`)
      .then(res => res.text())
      .then(html => {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = html;
        // Attach event listeners only if they haven't been attached yet
        if (!this.isListenersAttached) {
          this.setupEventListeners();
          this.isListenersAttached = true;
        }
        // If history tab clicked, load and render history via handler
        if (nav === 'history') {
          const historyHandler = new HomePageHistory(this);
          historyHandler.init();
        }
        // Highlight the active sidebar tab
        const navKey = nav === 'home' ? 'dashboard' : nav;
        this.highlightSidebarItem(navKey);
      })
      .catch(() => {
        document.getElementById('main-content').innerHTML = '<div style="padding:2rem;color:red;">Erreur : page non trouvée.</div>';
      });
  }

  /**
   * Adds 'active' class to the sidebar-item matching navKey, removes from others
   */
  highlightSidebarItem(navKey) {
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-nav') === navKey);
    });
  }
}

// Start the app
const app = new App();
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
