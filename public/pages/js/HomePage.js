import { BackupHandler } from '../../modules/backupHandler.js';
import { HomePageHistory } from './HomePageHistory.js';
import { MeetingDetailsPage } from './MeetingDetailsPage.js';

export class HomePage {
  constructor(app) {
    this.app = app;
    this.initializeElements();
    this.bindEvents();
    this.homePageHistory = new HomePageHistory(this.app);
  }

  initializeElements() {
    this.dashboardContainer = document.querySelector('.dashboard-grid');
    this.sessionControlButton = document.getElementById('sessionControlButton');
    this.homeControls = document.getElementById('home-controls');
    this.meetingControls = document.getElementById('meeting-controls');
    this.transcriptionSection = document.querySelector('.transcription');
    this.container = document.querySelector('.container');
    this.mainContent = document.querySelector('.main-content');
  }

  bindEvents() {
    if (this.sessionControlButton) {
      this.sessionControlButton.addEventListener('click', () => this.app.handleSessionControl());
    }

    // Listen for hash changes to handle meeting details navigation
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/meeting/')) {
        const meetingId = hash.replace('#/meeting/', '');
        this.showMeetingDetails(meetingId);
      }
    });
  }

  async showMeetingDetails(meetingId) {
    try {
      // Clear main content area
      if (this.mainContent) {
        this.mainContent.innerHTML = '<div class="loading">Chargement des détails de la réunion...</div>';
      }

      // Create and initialize meeting details page
      const meetingDetailsPage = new MeetingDetailsPage(
        meetingId, 
        this.app.MEETINGS_API_URL.replace(/\/$/, ''), // Remove trailing slash if present
        this.app
      );
      await meetingDetailsPage.init();

    } catch (error) {
      console.error('Error showing meeting details:', error);
      if (this.mainContent) {
        this.mainContent.innerHTML = `
          <div class="error-message">
            <h2>Erreur</h2>
            <p>Impossible de charger les détails de la réunion: ${error.message}</p>
            <button onclick="window.location.hash = '#/history'">Retour à l'historique</button>
          </div>
        `;
      }
    }
  }

  handleSessionControl() {
    this.app.handleSessionControl();
  }

  async loadDashboard() {
    const response = await fetch('pages/html/dashboard.html');
    const html = await response.text();
    if (this.mainContent) this.mainContent.innerHTML = html;
    document.body.style.overflow = '';
  }

  async loadHistory() {
    const response = await fetch('pages/html/history.html');
    const html = await response.text();
    if (this.mainContent) this.mainContent.innerHTML = html;
    if (this.homePageHistory) {
      await this.homePageHistory.init();
      this.homePageHistory.render();
    }
    document.body.style.overflow = 'hidden';
  }

  async loadSettings() {
    const response = await fetch('pages/html/settings.html');
    const html = await response.text();
    if (this.mainContent) this.mainContent.innerHTML = html;
    document.body.style.overflow = '';
  }

  async render() {
    if (this.homeControls) this.homeControls.style.display = 'block';
    if (this.meetingControls) this.meetingControls.style.display = 'none';

    // Show sidebar navigation links
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (sidebarNav) sidebarNav.style.display = 'block';
    this.app.ui.showSidebar();

    if (this.transcriptionSection) {
      this.transcriptionSection.style.display = 'none';
      if (this.container) this.container.classList.add('no-transcription');
    }
    if (this.sessionControlButton) {
      this.sessionControlButton.textContent = this.app.uiHandler.selectedTranslations.startSessionButton;
    }

    // decide which fragment based on hash
    const hash = window.location.hash.replace('#','');
    if (hash === 'history') {
      await this.loadHistory();
    } else if (hash === 'settings') {
      await this.loadSettings();
    } else {
      await this.loadDashboard();
    }
  }
} 