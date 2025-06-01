import HomePageSessionsHistoryPage from './HomePageSessionsHistoryPage.js';
import HomePageDashboard from './HomePageDashBoard.js';

export class HomePage {
  constructor(app) {
    this.app = app;
    this.homePageDashboard = new HomePageDashboard(this.app);
    // Meeting info and language controls moved from App
    this.meetingInfos = {};
    this.langSelect = document.getElementById('langSelect');

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
    this.highlightSidebarItem('dashboard');

  }

  highlightSidebarItem(navKey) {
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-nav') === navKey);
    });
  }

  /**
   * Initialize the home page when navigated to.
   */
  async init() {
    console.log('[HomePage] init() called');
    await this.render();
  }
 

  async handleStartSession() {
    // Fermer la modale
    this.app.uiHandler.closeMeetingModal();
    
    // Démarrer la session
    await this.startSession();
  
}

async startSession() {
  console.log("startSession HomePage");
    this.sessionActive = true;

    this.app.router.navigate('meeting');
    if (this.app.router && this.app.router.currentPage && this.app.router.currentPage.updateButtonStates) {
    this.app.router.currentPage.render();
    this.app.router.currentPage.updateButtonStates();}
  
}

  async loadFragment(nav) {
    if (nav === 'home' || nav === 'dashboard') {
      await this.app.router.navigate('home');
      this.highlightSidebarItem('dashboard');
      return;
    }
    try {
      const response = await fetch(`pages/html/${nav}.html`);
      const html = await response.text();
      const main = document.querySelector('.main-content');
      if (main) main.innerHTML = html;
      if (nav === 'sessions') {
        const historyHandler = new HomePageSessionsHistoryPage(this.app);
        await historyHandler.init();
      }
        this.highlightSidebarItem(nav);
      
    } catch (error) {
      const main = document.querySelector('.main-content');
      if (main) main.innerHTML = '<div style="padding:2rem;color:red;">Erreur : page non trouvée.</div>';
    }
  }
}

export default HomePage; 