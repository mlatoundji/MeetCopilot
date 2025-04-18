import { BackupHandler } from '../modules/backupHandler.js';
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

    // Add click handlers for tabs
    const tabs = document.querySelectorAll('[data-tab]');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabId = e.target.getAttribute('data-tab');
        this.switchTab(tabId);
      });
    });

    // Listen for hash changes to handle meeting details navigation
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/meeting/')) {
        const meetingId = hash.replace('#/meeting/', '');
        this.showMeetingDetails(meetingId);
      } else if (hash === '' || hash === '#') {
        // Return to dashboard when no specific meeting is selected
        this.switchTab('dashboard');
      }
    });
  }

  switchTab(tabId) {
    // Show all tab buttons
    const tabs = document.querySelectorAll('[data-tab]');
    tabs.forEach(tab => {
      if (tab.getAttribute('data-tab') === tabId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Show the selected tab content
    const selectedContent = document.querySelector(`[data-tab-content="${tabId}"]`);
    if (selectedContent) {
      selectedContent.style.display = 'block';
    }

    // If history tab is selected, render the history content
    if (tabId === 'history' && this.homePageHistory) {
      this.homePageHistory.render();
    }
  }

  async showMeetingDetails(meetingId) {
    try {
      // Keep the tabs visible but update active state
      const tabs = document.querySelectorAll('[data-tab]');
      tabs.forEach(tab => {
        tab.classList.remove('active');
      });

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
    this.app.backupHandler.initializeMeeting();
  }

  render() {
    // Show the dashboard tab
    const dashboardTab = document.querySelector('[data-tab="dashboard"]');
    if (dashboardTab) {
      dashboardTab.style.display = 'block';
    }

    const currentMeetingTab = document.querySelector('[data-tab="current-meeting"]');
    if (currentMeetingTab) {
      currentMeetingTab.style.display = 'none';
    }

    // Show the history tab
    const historyTab = document.querySelector('[data-tab="history"]');
    if (historyTab) {
      historyTab.style.display = 'block';
    }

    const settingsTab = document.querySelector('[data-tab="settings"]');
    if (settingsTab) {
      settingsTab.style.display = 'block';
    }
    
    // Configure home page controls
    if (this.homeControls) {
      this.homeControls.style.display = 'block';
    }
    
    if (this.meetingControls) {
      this.meetingControls.style.display = 'none';
    }
    
    // Hide transcription on home page
    if (this.transcriptionSection) {
      this.transcriptionSection.style.display = 'none';
      
      if (this.container) {
        this.container.classList.add('no-transcription');
      }
    }
    
    // Update session control button
    if (this.sessionControlButton) {
      this.sessionControlButton.textContent = this.app.uiHandler.selectedTranslations.startSessionButton;
    }

    // Show dashboard by default if no specific route
    if (!window.location.hash) {
      this.switchTab('dashboard');
    }
  }
} 