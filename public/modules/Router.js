import { HomePage } from '../pages/js/HomePage.js';
import { MeetingPage } from '../pages/js/MeetingPage.js';
import { LandingPage } from '../pages/js/LandingPage.js';
import { LoginPage } from '../pages/js/LoginPage.js';
import { MeetingDetailsPage } from '../pages/js/MeetingDetailsPage.js';

export class Router {
  constructor(app) {
    this.app = app;
    this.currentPage = null;
    this.pageModules = {}; // Cache for loaded page modules
    
    // Define routes with HTML and JS paths
    this.routes = {
      'home': {
        htmlPath: 'pages/html/home.html',
        jsPath: 'pages/js/HomePage.js'
      },
      'meeting': {
        htmlPath: 'pages/html/meeting.html',
        jsPath: 'pages/js/MeetingPage.js'
      },
      'login': {
        htmlPath: 'pages/html/login.html',
        jsPath: 'pages/js/LoginPage.js'
      },
      'register': {
        htmlPath: 'pages/html/register.html',
        jsPath: 'pages/js/RegisterPage.js'
      },
      'settings': {
        htmlPath: 'pages/html/settings.html',
        jsPath: 'pages/js/SettingsPage.js'
      },
      'profile': {
        htmlPath: 'pages/html/profile.html',
        jsPath: 'pages/js/ProfilePage.js'
      },
      'history': {
        htmlPath: 'pages/html/history.html',
        jsPath: 'pages/js/HistoryPage.js'
      },
    };
    
    // Initialiser la gestion du hash pour les routes dynamiques
    this.initializeHashHandler();
  }

  initialize() {
    // Listen for browser navigation (back/forward buttons)
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.page) {
        this.navigate(event.state.page, false);
      }
    });
    
    // Add click event listener for navigation links
    document.addEventListener('click', (event) => {
      // Find closest anchor tag
      const link = event.target.closest('a');
      if (link && link.hasAttribute('data-nav')) {
        event.preventDefault();
        const page = link.getAttribute('data-nav');
        this.navigate(page);
      }
    });
  }
  
  initializeHashHandler() {
    // Gérer les changements de hash pour les routes dynamiques
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.substring(1);
      
      // Vérifier si c'est une route de détail de réunion
      if (hash.startsWith('/meeting/')) {
        const meetingId = hash.replace('/meeting/', '');
        this.navigateToMeetingDetails(meetingId);
      }
    });
    
    // Vérifier le hash actuel au démarrage
    const initialHash = window.location.hash.substring(1);
    if (initialHash.startsWith('/meeting/')) {
      const meetingId = initialHash.replace('/meeting/', '');
      this.navigateToMeetingDetails(meetingId);
    }
  }
  
  async navigateToMeetingDetails(meetingId) {
    console.log(`Navigation vers détails de la réunion: ${meetingId}`);
    const mainContent = document.querySelector('.main-content');
    
    if (!mainContent) {
      console.error('Élément .main-content non trouvé');
      return false;
    }
    
    try {
      // Créer une nouvelle instance de MeetingDetailsPage
      const meetingDetailsPage = new MeetingDetailsPage(
        meetingId, 
        this.app.MEETINGS_API_URL,
        this.app
      );
      
      // Vider le contenu principal pour afficher les détails
      mainContent.innerHTML = '';
      
      // Initialiser et rendre la page des détails
      await meetingDetailsPage.init();
      
      // Mettre à jour la page courante
      this.currentPage = meetingDetailsPage;
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la navigation vers les détails de la réunion:', error);
      mainContent.innerHTML = `
        <div class="error-message">
          <h2>Erreur</h2>
          <p>Impossible de charger les détails de la réunion: ${error.message}</p>
          <button onclick="window.location.hash='history'">Retour à l'historique</button>
        </div>
      `;
      return false;
    }
  }

  parseLocationUrl() {
    // Extract page name from hash URL
    const hash = window.location.hash.substring(1);
    return hash || null;
  }
  
  /**
   * Navigate to a specific page
   * @param {string} pageName - Name of the page to navigate to
   * @param {boolean} pushState - Whether to update browser history
   * @returns {Promise<boolean>} - Success/failure of navigation
   */
  async navigate(pageName, pushState = true) {
    if (!this.routes[pageName]) {
      console.error(`Route '${pageName}' not found`);
      pageName = 'home';
    }

    const route = this.routes[pageName];
    const mainContent = document.querySelector('.main-content');

    try {
      // Load page fragment into main-content
      if (mainContent) {
        const htmlResponse = await fetch(route.htmlPath);
        const htmlContent = await htmlResponse.text();
        mainContent.innerHTML = htmlContent;
      } else {
        console.warn('Router: .main-content not found');
      }

      if (route.jsPath) {
        if (this.pageModules[pageName]) {
          this.currentPage = new this.pageModules[pageName].default(this.app);
        } else {
          try {
            const module = await import(`../${route.jsPath}`);
            this.pageModules[pageName] = module;
            if (module[pageName.charAt(0).toUpperCase() + pageName.slice(1) + 'Page']) {
              const PageClass = module[pageName.charAt(0).toUpperCase() + pageName.slice(1) + 'Page'];
              this.currentPage = new PageClass(this.app);
            } else if (module.default) {
              this.currentPage = new module.default(this.app);
            } else {
              console.error(`Module for page '${pageName}' does not have a default export or named export`);
            }
          } catch (error) {
            console.error(`Error importing module for page '${pageName}':`, error);
          }
        }
        if (this.currentPage && typeof this.currentPage.init === 'function') {
          await this.currentPage.init();
        }
      }

      if (pushState) {
        history.pushState({ page: pageName }, null, `#${pageName}`);
      }
      const pageLoadedEvent = new CustomEvent('pageLoaded', { 
        detail: { page: pageName }
      });
      window.dispatchEvent(pageLoadedEvent);

      // After injecting HTML, if we're on home and a sidebar is inside main-content, move it to container
      if (pageName === 'home') {
        const container = document.querySelector('.container');
        if (container && mainContent) {
          // Ensure only one sidebar in container
          const sidebars = Array.from(container.querySelectorAll(':scope > .sidebar'));
          if (sidebars.length > 1) {
            sidebars.slice(1).forEach(sb => sb.remove());
          }

          const sidebarInContent = mainContent.querySelector('.sidebar');
          if (sidebarInContent) {
            container.insertBefore(sidebarInContent, mainContent);
          }

          // Remove any remaining empty comments in main-content
          const leftover = mainContent.querySelector('.sidebar');
          if (leftover) leftover.remove();
        }
        // Bind sidebar navigation buttons
        document.querySelectorAll('.sidebar-item').forEach(item => {
          item.addEventListener('click', () => {
            const target = item.getAttribute('data-nav') || 'home';
            this.navigate(target);
          });
        });
      }

      return true;
    } catch (error) {
      console.error(`Error navigating to page '${pageName}':`, error);
      return false;
    }
  }
  
  /**
   * Get the current page instance
   * @returns {Object} Current page instance
   */
  getCurrentPage() {
    return this.currentPage;
  }
} 