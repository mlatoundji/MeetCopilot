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
    this.homeControls = document.getElementById('home-controls');
    this.meetingControls = document.getElementById('meeting-controls');
    this.mainContent = document.querySelector('.main-content');
  }

  bindEvents() {

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

  async loadHomePage() {
    const response = await fetch('pages/html/home.html');
    const html = await response.text();
    if (this.mainContent) this.mainContent.innerHTML = html;
    document.body.style.overflow = '';

    // Hide transcription area on home
    const transcription = document.querySelector('.transcription');
    const containerElem = document.querySelector('.container');
    if (transcription) transcription.style.display = 'none';
    if (containerElem && !containerElem.classList.contains('no-transcription')) containerElem.classList.add('no-transcription');

    // Refresh UIHandler references for modal elements now present in DOM
    const uiH = this.app.uiHandler;
    uiH.meetingModal = document.getElementById('meetingModal');
    uiH.modalOverlay = document.getElementById('modalOverlay'); // overlay is global
    uiH.dynamicFields = document.getElementById('dynamicFields');
    uiH.saveMeetingInfosButton = document.getElementById('saveMeetingInfosButton');
    uiH.closeMeetingInfosButton = document.getElementById('closeMeetingInfosButton');
    uiH.sessionControlButton = document.getElementById('sessionControlButton');

    // If sidebar exists inside mainContent, move it to container root (before main-content)
    const container = document.querySelector('.container');
    const sidebarInFragment = this.mainContent ? this.mainContent.querySelector('.sidebar') : null;
    if (container && sidebarInFragment) {
      // Prevent duplicate insertion
      if (!document.querySelector('.container > .sidebar')) {
        container.insertBefore(sidebarInFragment, container.querySelector('.main-content'));
      } else {
        // If sidebar already exists in container, remove duplicate in fragment
        sidebarInFragment.remove();
      }
      // Reinitialize sidebar collapse handlers
      if (this.app && this.app.ui) {
        this.app.ui.setupSidebar();
      }
    }
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

    const meetingSidebar = document.querySelector('.meeting-sidebar');
    if (meetingSidebar) meetingSidebar.style.display = 'none';

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
      await this.loadHomePage();
      // Bind session start button inside dashboard
     this.bindSessionStartButton();
      // After dashboard loads, render recent meetings as cards
      this.renderRecentMeetingsCards();
    }
  }

  async renderRecentMeetingsCards() {
    // Fetch recent meetings from API
    try {
      const response = await fetch(this.app.MEETINGS_API_URL + '?saveMethod=local');
      const data = await response.json();
      if (!data.success || !Array.isArray(data.data)) return;
      const meetings = data.data;
      const dashboardGrid = document.querySelector('.dashboard-grid');
      if (!dashboardGrid) return;
      // Remove old recent-summaries section if present
      const oldSummaries = dashboardGrid.querySelector('.recent-summaries');
      if (oldSummaries) oldSummaries.remove();
      // Create recent meetings cards section
      let cardsSection = dashboardGrid.querySelector('.recent-meetings-cards');
      if (!cardsSection) {
        cardsSection = document.createElement('div');
        cardsSection.className = 'recent-meetings-cards';
        dashboardGrid.appendChild(cardsSection);
      }
      cardsSection.innerHTML = '<h3>Réunions récentes</h3>';
      const cardsList = document.createElement('div');
      cardsList.className = 'meetings-cards-list';
      if (meetings.length === 0) {
        // Show 'Empty' label in recent-meetings-list if present
        const emptyLabel = document.querySelector('.recent-meetings-list .no-recent-meetings');
        if (emptyLabel) emptyLabel.style.display = '';
        cardsSection.appendChild(cardsList);
        return;
      } else {
        // Hide 'Empty' label in recent-meetings-list if present
        const emptyLabel = document.querySelector('.recent-meetings-list .no-recent-meetings');
        if (emptyLabel) emptyLabel.style.display = 'none';
      }
      meetings.slice(0, 6).forEach(meeting => {
        const card = document.createElement('div');
        card.className = 'meeting-card';
        card.innerHTML = `
          <div class="meeting-info">
            <h3 class="meeting-title">${meeting.title || 'Sans titre'}</h3>
            <div class="meeting-meta">
              <span class="meeting-date">${meeting.metadata && meeting.metadata.startTime ? new Date(meeting.metadata.startTime).toLocaleString() : 'XX/XX/XXXX'}</span>
              <span class="meeting-duration">${meeting.metadata && meeting.metadata.duration ? this.formatDuration(meeting.metadata.duration) : '00:00:00'}</span>
              <span class="save-method">${meeting.metadata.saveMethod === 'local' ? 'Local' : 'Cloud'}</span>
            </div>
          </div>
        `;
        card.addEventListener('click', () => {
          window.location.hash = `#/meeting/${meeting.id}`;
        });
        cardsList.appendChild(card);
      });
      cardsSection.appendChild(cardsList);
      // Add styles if not present
      if (!document.getElementById('recent-meetings-cards-styles')) {
        const style = document.createElement('style');
        style.id = 'recent-meetings-cards-styles';
        style.textContent = `
          .recent-meetings-cards { background: var(--bg-secondary); border-radius: 8px; padding: 1rem; box-shadow: 0 2px 4px var(--shadow-color); }
          .recent-meetings-cards h3 { margin-top: 0; color: var(--text-primary); }
          .meetings-cards-list { display: flex; flex-wrap: wrap; gap: 20px; }
          .meeting-card { display: flex; align-items: center; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(33,150,243,0.08); padding: 16px; min-width: 260px; max-width: 340px; flex: 1 1 260px; cursor: pointer; transition: box-shadow 0.2s, transform 0.2s; }
          .meeting-card:hover { box-shadow: 0 6px 16px rgba(33,150,243,0.18); transform: translateY(-2px); }
          .meeting-avatar { width: 56px; height: 56px; border-radius: 50%; margin-right: 16px; object-fit: cover; background: #f5f5f5; }
          .meeting-title { font-size: 18px; font-weight: 700; margin: 0 0 8px 0; color: #424242; }
          .meeting-meta { font-size: 14px; color: #607D8B; display: flex; gap: 16px; }
        `;
        document.head.appendChild(style);
      }
    } catch (e) {
      // Optionally show error
    }
  }

  formatDuration(duration) {
    if (!duration || isNaN(duration)) return '';
    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
  }

  // Placeholder for upcoming meetings logic
  hideUpcomingEmptyLabelIfItems() {
    const upcomingList = document.querySelector('.upcoming-meetings-list');
    const emptyLabel = upcomingList ? upcomingList.querySelector('.no-upcoming-meetings') : null;
    if (upcomingList && upcomingList.children.length > 1 && emptyLabel) {
      // If there are items besides the empty label, hide the empty label
      emptyLabel.style.display = 'none';
    } else if (emptyLabel) {
      emptyLabel.style.display = '';
    }
  }

  bindSessionStartButton() {
    const btn = document.getElementById('sessionControlButton');
    if (btn) {
      // Remove previous listener if any to avoid duplicates
      btn.replaceWith(btn.cloneNode(true));
      const newBtn = document.getElementById('sessionControlButton');
      if (newBtn) {
        newBtn.addEventListener('click', () => this.app.handleSessionControl());
      }
    }
  }
} 