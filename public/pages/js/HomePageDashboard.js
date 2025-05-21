import HomePageHistory from './HomePageHistory.js';

export default class HomePageDashboard {
  constructor(app) {
    this.app = app;
    this.apiHandler = this.app?.apiHandler;
    this.meetings_api_url = `${this.apiHandler?.baseURL || 'http://localhost:3000'}/api/meetings`;
    this.dashboardContainer = null;
  }

  async init() {
    await this.loadFragment();
    this.bindEvents();
    await this.render();
  }

  async loadFragment() {
    const main = document.querySelector('.main-content');
    if (!main) {
      console.error('Dashboard: .main-content not found');
      return;
    }
    // Clear main content and inject dashboard fragment
    main.innerHTML = '';
    this.dashboardContainer = document.createElement('div');
    this.dashboardContainer.id = 'dashboard-fragment';
    main.appendChild(this.dashboardContainer);
    try {
      const response = await fetch('pages/html/dashboard.html');
      this.dashboardContainer.innerHTML = await response.text();
    } catch (error) {
      console.error('Erreur lors du chargement du fragment Dashboard:', error);
    }
  }

  bindEvents() {
    const startBtn = document.getElementById('sessionControlButton');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.handleSessionControl());
    }
  }

  async render() {
    await this.renderRecentMeetingsCards();
  }

  async renderRecentMeetingsCards() {
    // Find the list inside our dashboard fragment container
    const list = this.dashboardContainer.querySelector('.recent-meetings-list');
    if (!list) {
      console.error('Dashboard: .recent-meetings-list not found in dashboard fragment');
      return;
    }
    try {
      const res = await fetch(`${this.meetings_api_url}?saveMethod=local`);
      const result = await res.json();
      const emptyLabel = list.querySelector('.no-recent-meetings');
      if (!result.success || !Array.isArray(result.data) || result.data.length === 0) {
        if (emptyLabel) emptyLabel.style.display = '';
        return;
      }
      if (emptyLabel) emptyLabel.style.display = 'none';
      // Remove old cards
      Array.from(list.children).forEach(el => {
        if (!el.classList.contains('no-recent-meetings')) list.removeChild(el);
      });
      // Add up to 4 new cards
      result.data.slice(0, 4).forEach(meeting => {
        const card = this.createMeetingCard(meeting);
        list.appendChild(card);
      });
      // Add "Voir plus" link to full history (load fragment)
      const moreLink = document.createElement('div');
      moreLink.className = 'recent-meetings-more';
      const link = document.createElement('a');
      link.href = 'javascript:void(0)';
      link.textContent = 'Voir plus';
      link.addEventListener('click', () => {
        // Initialize and display the full history fragment
        const historyHandler = new HomePageHistory(this.app);
        historyHandler.init();
      });
      moreLink.appendChild(link);
      list.appendChild(moreLink);
    } catch (e) {
      console.error('Erreur Dashboard renderRecentMeetingsCards:', e);
    }
  }

  createMeetingCard(meeting) {
    const card = document.createElement('div');
    card.className = 'meeting-card';
    card.addEventListener('click', () => {
      window.location.hash = `/meeting/${meeting.id}`;
    });
    const dateStr = meeting.metadata?.startTime
      ? new Date(meeting.metadata.startTime).toLocaleString()
      : '';
    const dur = meeting.metadata?.duration || 0;
    const durationStr = this.formatDuration(dur);
    const saveMethod = meeting.metadata?.saveMethod === 'local' ? 'Local' : 'Cloud';
    card.innerHTML = `
      <div class="meeting-info">
        <h3 class="meeting-title">${meeting.title || 'Sans titre'}</h3>
        <div class="meeting-meta">
          <span class="meeting-date">${dateStr}</span>
          <span class="meeting-duration">${durationStr}</span>
          <span class="save-method">${saveMethod}</span>
        </div>
      </div>
    `;
    return card;
  }

  formatDuration(sec) {
    const total = Math.floor(sec);
    const h = Math.floor(total / 3600).toString().padStart(2, '0');
    const m = Math.floor((total % 3600) / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  async handleSessionControl() {
    if (this.app) {
      await this.app.uiHandler.populateMeetingModal();
    }
  }
} 