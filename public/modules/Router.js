import { HomePage } from '../pages/HomePage.js';
import { MeetingPage } from '../pages/MeetingPage.js';
import { HistoryPage } from '../pages/HistoryPage.js';
export class Router {
  constructor(app) {
    this.app = app;
    this.currentPage = null;
    this.routes = {
      'home': HomePage,
      'meeting': MeetingPage,
      'history': HistoryPage
    };
    this.initializeRouter();
  }

  initializeRouter() {
    // Ajouter un écouteur d'événements pour le changement d'URL
    window.addEventListener('hashchange', () => this.handleRouteChange());
    
    // Ajouter des gestionnaires d'événements pour les onglets
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabId = e.currentTarget.getAttribute('data-tab');
        if (tabId === 'current-meeting') {
          this.navigateTo('meeting');
        } else if (tabId === 'history') {
          this.navigateTo('history');
        } else {
          this.navigateTo('home');
        }
      });
    });
    
    // Navigation initiale
    this.handleRouteChange();
  }

  handleRouteChange() {
    const hash = window.location.hash.substr(1);
    const route = hash || 'home';
    this.loadPage(route);
  }

  navigateTo(route) {
    window.location.hash = route;
  }

  loadPage(route) {
    // Déterminer quelle page charger
    const PageClass = this.routes[route] || this.routes.home;
    
    // Instancier la nouvelle page
    this.currentPage = new PageClass(this.app);
    
    // Rendre la page
    this.currentPage.render();
    
    // Mettre à jour les classes actives sur les onglets
    this.updateActiveTab(route);
  }

  updateActiveTab(route) {
    // Mettre à jour les classes actives sur les onglets
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
      
      const tabId = tab.getAttribute('data-tab');
      if ((route === 'home' && (tabId === 'dashboard' || tabId === 'history' || tabId === 'settings')) || 
          (route === 'meeting' && tabId === 'current-meeting')) {
        tab.classList.add('active');
      }
    });
  }
} 