import { HomePage } from '../pages/js/HomePage.js';
import { MeetingPage } from '../pages/js/MeetingPage.js';
import { LandingPage } from '../pages/js/LandingPage.js';
import AuthPage from '../pages/js/AuthPage.js';
import { MeetingDetailsPage } from '../pages/js/MeetingDetailsPage.js';

export class Router {
  constructor(app) {
    this.app = app;
    this.currentPage = null;
    this.pageModules = {}; // Cache for loaded page modules
    
    // Define routes with HTML and JS paths
    this.routes = {
      // Landing page as default
      'landing': {
        htmlPath: 'pages/html/landing.html',
        jsPath: 'pages/js/LandingPage.js',
        hasSidebar: false
      },
      'home': {
        htmlPath: 'pages/html/home.html',
        jsPath: 'pages/js/HomePage.js',
        hasSidebar: true
      },
      'meeting': {
        htmlPath: 'pages/html/meeting.html',
        jsPath: 'pages/js/MeetingPage.js',
        hasSidebar: false
      },
      'login': {
        htmlPath: 'pages/html/auth.html',
        jsPath: 'pages/js/AuthPage.js',
        hasSidebar: false
      },
      'register': {
        htmlPath: 'pages/html/auth.html',
        jsPath: 'pages/js/AuthPage.js',
        hasSidebar: false
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
    // Handle hash changes for dynamic routing
    window.addEventListener('hashchange', (event) => {
      const hash = window.location.hash.substring(1);
      if (hash === '') {
        this.navigate('landing', false);
        return;
      }
      // Meeting details route: /meeting/:id
      if (hash.startsWith('/meeting/')) {
        const meetingId = hash.replace('/meeting/', '');
        this.navigateToMeetingDetails(meetingId);
      } else {
        // Generic page routes (home, login, register, etc.)
        if (this.routes[hash]) {
          this.navigate(hash, false);
        }
      }
    });
    
    // Handle initial hash for meeting details at startup
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
          <button onclick="window.location.hash='home'">Retour à l'accueil</button>
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
        if (!htmlResponse.ok) {
          throw new Error(`Failed to load page: ${htmlResponse.status} ${htmlResponse.statusText}`);
        }
        const htmlContent = await htmlResponse.text();
        mainContent.innerHTML = htmlContent;
      } else {
        console.warn('Router: .main-content not found');
      }

      if (route.jsPath) {
        let PageClass;
        if (this.pageModules[pageName]) {
          // Cached PageClass
          PageClass = this.pageModules[pageName];
        } else {
          try {
            const module = await import(`../${route.jsPath}`);
            // Determine the export: Named Page class or default
            const namedExport = pageName.charAt(0).toUpperCase() + pageName.slice(1) + 'Page';
            if (module[namedExport]) {
              PageClass = module[namedExport];
            } else if (module.default) {
              PageClass = module.default;
            } else {
              console.error(`Module for page '${pageName}' does not have expected export`);
              return false;
            }
            // Cache the PageClass for future navigations
            this.pageModules[pageName] = PageClass;
          } catch (error) {
            console.error(`Error importing module for page '${pageName}':`, error);
            return false;
          }
        }
        try {
          this.currentPage = new PageClass(this.app);
        } catch (instErr) {
          console.error(`Error instantiating page '${pageName}':`, instErr);
          return false;
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

      // Gérer la sidebar en fonction de la configuration de la route
      this.handleSidebar(pageName, route.hasSidebar);
      // Toggle body class to hide/show global header and sidebar via CSS
      document.body.classList.toggle('no-global-ui', !route.hasSidebar);

      return true;
    } catch (error) {
      console.error(`Error navigating to page '${pageName}':`, error);
      return false;
    }
  }
  
  /**
   * Gère l'affichage de la sidebar selon la page
   * @param {string} pageName - Nom de la page
   * @param {boolean} hasSidebar - Indique si la page doit avoir une sidebar
   */
  handleSidebar(pageName, hasSidebar) {
    const container = document.querySelector('.container');
    const mainContent = document.querySelector('.main-content');
    
    if (!container || !mainContent) return;
    
    // Supprimer toutes les sidebars existantes du container
    const existingSidebars = Array.from(container.querySelectorAll(':scope > .sidebar'));
    existingSidebars.forEach(sidebar => sidebar.remove());
    
    if (hasSidebar) {
      // Si la page doit avoir une sidebar, vérifier si elle est dans le mainContent
      const sidebarInContent = mainContent.querySelector('.sidebar');
      
      if (sidebarInContent) {
        // Déplacer la sidebar du mainContent vers le container
        container.insertBefore(sidebarInContent, mainContent);
      }
      
      // Supprimer tout résidu de sidebar dans le mainContent
      const leftoverSidebar = mainContent.querySelector('.sidebar');
      if (leftoverSidebar) leftoverSidebar.remove();
      
      // Activer les boutons de navigation de la sidebar
      document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
          const target = item.getAttribute('data-nav') || 'home';
          this.navigate(target);
        });
      });
    } else {
      // Si la page ne doit pas avoir de sidebar, s'assurer qu'il n'y en a pas dans le mainContent
      const sidebarInContent = mainContent.querySelector('.sidebar');
      if (sidebarInContent) sidebarInContent.remove();
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