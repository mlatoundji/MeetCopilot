import { HomePage } from '../pages/js/HomePage.js';
import { MeetingPage } from '../pages/js/MeetingPage.js';
import { LandingPage } from '../pages/js/LandingPage.js';
import { LoginPage } from '../pages/js/LoginPage.js';

export class Router {
  constructor(app) {
    this.app = app;
    this.currentPage = null;
    this.routes = {
      'landing': LandingPage,
      'login': LoginPage,
      'home': HomePage,
      'meeting': MeetingPage,
    };
    this.initializeRouter();
  }

  initializeRouter() {
    // Ajouter un écouteur d'événements pour le changement d'URL
    window.addEventListener('hashchange', () => this.handleRouteChange());
    
    // Navigation initiale
    this.handleRouteChange();
  }

  handleRouteChange() {
    const hash = window.location.hash.substr(1);
    const route = hash || 'landing';
    this.loadPage(route);
  }

  navigateTo(route) {
    window.location.hash = route;
  }

  async loadPage(route) {
    if(this.currentPage && typeof this.currentPage.destroy==='function') this.currentPage.destroy();
    const PageClass = this.routes[route] || this.routes.home;
    this.currentPage = new PageClass(this.app);
    if (typeof this.currentPage.render === 'function') {
      await this.currentPage.render();
    }
  }
} 