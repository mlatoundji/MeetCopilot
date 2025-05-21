import { AudioCapture } from './modules/audioCapture.js';
import { TranscriptionHandler } from './modules/transcriptionHandler.js';
import { UIHandler } from './modules/uiHandler.js';
import { SuggestionsHandler } from './modules/suggestionsHandler.js';
import { ConversationContextHandler } from './modules/conversationContextHandler.js';
import { Router } from './modules/Router.js';
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
    
    
    // Initialize handlers that depend on API
    this.audioCapture = new AudioCapture();
    this.uiHandler = new UIHandler();
    this.dataStore = new DataStore(this.apiHandler);
    this.transcriptionHandler = new TranscriptionHandler(this.apiHandler);
    this.suggestionsHandler = new SuggestionsHandler(this.apiHandler);
    this.conversationContextHandler = new ConversationContextHandler(this.apiHandler);
    this.backupHandler = new BackupHandler(this);
    this.ui = new UI();
    
    // Set up router
    this.router = new Router(this);
    this.router.initialize();

    // Current app state
    this.currentLanguage = 'fr';
    this.useSilenceMode = true; // toggle between interval and silence-detection modes

    
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

  // Functions to handle meeting info modals
  handleCloseMeetingInfos() {
    console.log("close meeting")
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
    console.log("startSession App");
    this.sessionActive = true;

    this.backupHandler.initializeMeeting(this.meetingInfos);
    this.router.navigate('meeting');
    if (this.router && this.router.currentPage && this.router.currentPage.updateButtonStates) {
      this.router.currentPage.render();
      this.router.currentPage.updateButtonStates();
    }
  }

  async init() {
    console.log("App initializing");
    this.uiHandler.setupLanguageSwitcher();
    // Delegate sidebar behavior to UI
    this.ui.setupSidebar();
    
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
    const initialPage = this.router.parseLocationUrl() || 'landing';
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
