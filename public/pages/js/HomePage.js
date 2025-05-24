import HomePageHistory from './HomePageHistory.js';
import HomePageDashboard from './HomePageDashboard.js';

export class HomePage {
  constructor(app) {
    this.app = app;
    this.homePageDashboard = new HomePageDashboard(this.app);
    // Meeting info and language controls moved from App
    this.meetingInfos = {};
    this.saveMeetingInfosButton = document.getElementById('saveMeetingInfosButton');
    this.closeMeetingInfosButton = document.getElementById('closeMeetingInfosButton');
    this.langSelect = document.getElementById('langSelect');
    if (this.saveMeetingInfosButton) {
      this.saveMeetingInfosButton.addEventListener('click', () => this.handleSaveMeetingInfos());
    }
    if (this.closeMeetingInfosButton) {
      this.closeMeetingInfosButton.addEventListener('click', () => this.handleCloseMeetingInfos());
    }
    if (this.langSelect) {
      this.langSelect.addEventListener('change', (e) => this.app.handleLanguageChange(e.target.value));
    }
    // Delegation for modal start session button
    document.addEventListener('click', async (e) => {
        if (e.target && e.target.id === 'startSessionButton') {
            await this.handleStartSession();
        }
    });
  }

  async render() {
    console.log('[HomePage] render()');
    // Show global header and main sidebar on home page
    const header = document.querySelector('.header-horizontal');
    if (header) header.style.display = '';
    const mainSidebar = document.querySelector('.sidebar');
    if (mainSidebar) mainSidebar.style.display = '';
    // Initialize the home page and show dashboard fragment by default
    await this.homePageDashboard.init();
    // Sidebar navigation for static fragments
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const nav = item.getAttribute('data-nav');
        this.loadFragment(nav);
      });
    });
  }

  /**
   * Initialize the home page when navigated to.
   */
  async init() {
    console.log('[HomePage] init() called');
    await this.render();
  }

  // Functions to handle meeting info modals
  handleCloseMeetingInfos() {
    console.log("close meeting")
    this.app.uiHandler.closeMeetingModal();
  }

  async handleSaveMeetingInfos() {
    const values = this.app.uiHandler.meetingsInfosLabels.map(key => {
      const input = document.getElementById(`input-${key}`);
      return input.value.trim();
    });
    
    // Construct meetingInfos as a single object with key-value pairs
    this.meetingInfos = this.app.uiHandler.meetingsInfosLabels.reduce((acc, key, index) => {
      acc[key] = values[index];
      return acc;
    }, {});
    
    let details = Object.entries(this.meetingInfos)
      .map(([key, value]) => `* ${key} : ${value}`)
      .join("\n");
    
    this.app.conversationContextHandler.updateMeetingInfosText(details);
    this.app.conversationContextHandler.updateConversationContextHeadersText();
    console.log("Meetings details :\n", this.app.conversationContextHandler.conversationContextMeetingInfosText);
    
    // Fermer la modale
    this.app.uiHandler.closeMeetingModal();
    
    // Démarrer la session
    await this.startSession();
  }

  async handleStartSession() {
    if (this.app.uiHandler.mode === 'assiste') {
      // Basculer vers l'onglet réunion si en mode assisté
      const tabs = this.app.uiHandler.dynamicFields.querySelectorAll('.modal-tab');
      tabs.forEach(t => t.classList.remove('active'));
      this.app.uiHandler.dynamicFields.querySelector('[data-tab-modal="meeting"]').classList.add('active');
      
      this.app.uiHandler.dynamicFields.querySelectorAll('.tab-content-modal').forEach(content => {
          content.classList.remove('active');
      });
      document.getElementById('meeting-tab').classList.add('active');
      
      // Afficher le bouton de sauvegarde
      if (this.saveMeetingInfosButton) {
          this.saveMeetingInfosButton.style.display = 'block';
      }
  } else {
    // Fermer la modale
    this.app.uiHandler.closeMeetingModal();
    
    // Démarrer la session
    await this.startSession();
  }
}

async startSession() {
  console.log("startSession HomePage");
    this.sessionActive = true;

    this.app.backupHandler.initializeMeeting(this.meetingInfos);
    this.app.router.navigate('meeting');
    if (this.app.router && this.app.router.currentPage && this.app.router.currentPage.updateButtonStates) {
    this.app.router.currentPage.render();
    this.app.router.currentPage.updateButtonStates();}
  
}

  async loadFragment(nav) {
    if (nav === 'home' || nav === 'dashboard') {
      await this.app.router.navigate('home');
      this.app.highlightSidebarItem('dashboard');
      return;
    }
    try {
      const response = await fetch(`pages/html/${nav}.html`);
      const html = await response.text();
      const main = document.querySelector('.main-content');
      if (main) main.innerHTML = html;
      if (nav === 'history') {
        const historyHandler = new HomePageHistory(this.app);
        await historyHandler.init();
      }
      // Highlight the History tab in the sidebar
      if (this.app && typeof this.app.highlightSidebarItem === 'function') {
        this.app.highlightSidebarItem(nav);
      }
    } catch (error) {
      const main = document.querySelector('.main-content');
      if (main) main.innerHTML = '<div style="padding:2rem;color:red;">Erreur : page non trouvée.</div>';
    }
  }
}

export default HomePage; 