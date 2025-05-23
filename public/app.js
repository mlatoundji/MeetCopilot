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
    // Bind assistant reply UI update
    this.conversationContextHandler.updateUIAfterAssistant = (assistantText) => {
      // For now, show assistant reply in suggestions panel
      if(this.uiHandler){
        this.uiHandler.updateSuggestions(assistantText);
      }
    };
    this.backupHandler = new BackupHandler(this);
    this.ui = new UI();
    
    this.sessionActive = false; 
    
    // Current app state
    this.useSilenceMode = true; // toggle between interval and silence-detection modes
    
    this.currentLanguage = 'fr';
    this.initializeLanguage();

    // Set up router
    this.router = new Router(this);
    this.router.initialize();
    
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

  async initializeLanguage() {
    try {
      // Initialize UI with language selection
      this.uiHandler.initialize((newLang) => {
        this.handleLanguageChange(newLang);
      });
      
    } catch (error) {
      console.error('Error initializing language:', error);
      // Show error notification if available
      if (this.ui.showNotification) {
        this.ui.showNotification('Error initializing language', 'error');
      }
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
     if (pageName === 'home') {
        // Highlight Home dashboard
        tabKey = 'dashboard';
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
