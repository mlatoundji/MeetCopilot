export default class HomePageDashboard {
  constructor(app) {
    this.app = app;
    this.apiHandler = this.app?.apiHandler;
    this.sessionsApiUrl = `${this.apiHandler?.baseURL || 'http://localhost:3000'}/api/sessions`;
    this.dashboardContainer = null;
  }

  async init() {
    console.log('[HomePageDashboard] init() called');
    await this.loadFragment();
    await this.renderResumeSessionButton();
    this.bindEvents();
    await this.render();
  }

  async loadFragment() {
    console.log('[HomePageDashboard] loadFragment() called');
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
      startBtn.addEventListener('click', async () => {
        // If a session is already in progress, ask user what to do via modal
        const current = localStorage.getItem('currentSessionId');
        if (current) {
          const action = await this.showSessionDecisionModal(); // 'save', 'delete', 'cancel'
          if (action === 'save') {
            await this.app.sessionHandler.completeSession();
          } else if (action === 'delete') {
            await this.app.sessionHandler.deleteSession();
          } else {
            return; // Cancel new session creation
          }
        }
        this.handleSessionControl();
      });
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
      // Fetch sessions via APIHandler to include auth header
      const result = await this.app.apiHandler.getSessions();
      const sessions = result.data;
      const emptyLabel = list.querySelector('.no-recent-meetings');
      if (!Array.isArray(sessions) || sessions.length === 0) {
        if (emptyLabel) emptyLabel.style.display = '';
        return;
      }
      if (emptyLabel) emptyLabel.style.display = 'none';
      // Remove old cards
      Array.from(list.children).forEach(el => {
        if (!el.classList.contains('no-recent-meetings')) list.removeChild(el);
      });
      // Add up to 4 new cards
      sessions.slice(0, 4).forEach(session => {
        const card = this.createMeetingCard(session);
        list.appendChild(card);
      });
      // Add "Voir plus" link to full sessions list
      const moreLink = document.createElement('div');
      moreLink.className = 'recent-meetings-more';
      const link = document.createElement('a');
      link.href = 'javascript:void(0)';
      link.textContent = 'Voir plus';
      link.addEventListener('click', async () => {
        const homePage = this.app.router.getCurrentPage();
        if (homePage && typeof homePage.loadFragment === 'function') {
          await homePage.loadFragment('sessions');
        }
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
      window.location.hash = `/sessions/${meeting.id}`;
    });
    // Title
    const title = meeting.session_title || meeting.custom_context?.session_title || 'Sans titre';
    // Start date/time
    const dateStr = meeting.start_time
      ? new Date(meeting.start_time).toLocaleString()
      : 'Date inconnue';
    // Duration: use end_time if present, else since start
    let durMs = 0;
    if (meeting.start_time) {
      const startMs = new Date(meeting.start_time).getTime();
      const endMs = meeting.end_time
        ? new Date(meeting.end_time).getTime()
        : Date.now();
      durMs = endMs - startMs;
    }
    const durationStr = this.formatDuration(Math.floor(durMs / 1000));
    // Description if available
    const desc = meeting.description || meeting.custom_context?.description || '';
    card.innerHTML = `
      <div class="meeting-info">
        <h3 class="meeting-title">${title}</h3>
        <div class="meeting-meta">
          <span class="meeting-date">${dateStr}</span>
          <span class="meeting-duration">${durationStr}</span>
        </div>
        ${desc ? `<div class="meeting-description">${desc}</div>` : ''}
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

  /**
   * If there is a pending session, show a resume button
   */
  async renderResumeSessionButton() {
    try {
      // Use APIHandler to include JWT
      const res = await this.app.apiHandler.callApi(
        `${this.apiHandler.baseURL}${this.app.apiHandler.apiPrefix}/sessions?status=pending`,
        { method: 'GET' }
      );
      const sessions = res.data || res;
      if (sessions.length == 0) {
        console.log('No pending sessions, removing currentSessionId');
        localStorage.removeItem('currentSessionId');
        return;
      }
      if (Array.isArray(sessions) && sessions.length > 0) {
        const session = sessions[0];
        localStorage.setItem('currentSessionId', session.id);
        const container = this.dashboardContainer;
        if (container) {
          // Create resume button
          const resumeBtn = document.createElement('button');
          resumeBtn.id = 'resumeSessionButton';
          resumeBtn.className = 'button session-resume-btn';
          resumeBtn.style.marginBottom = '1rem';
          const t = this.app.uiHandler.getTranslations();
          resumeBtn.textContent = t.sessionResume || 'Reprendre la session en cours';
          resumeBtn.addEventListener('click', () => {
            // Save pending session ID for resume logic
            window.location.hash = 'meeting';
          });
          // Insert above start button
          const startBtn = container.querySelector('#sessionControlButton');
          if (startBtn && startBtn.parentNode) {
            startBtn.parentNode.insertBefore(resumeBtn, startBtn.nextSibling);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching pending sessions:', err);
    }
  }

  /**
   * Display a modal with options to save, delete, or cancel session in progress.
   * @returns {Promise<'save'|'delete'|'cancel'>}
   */
  showSessionDecisionModal() {
    return new Promise(resolve => {
      // Overlay
      const overlay = document.createElement('div');
      Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '1000'
      });
      // Modal box
      const modal = document.createElement('div');
      Object.assign(modal.style, {
        background: '#fff', padding: '1rem', borderRadius: '4px', textAlign: 'center', minWidth: '300px'
      });
      const message = document.createElement('p');
      message.innerText = 'Une session est déjà en cours. Que voulez-vous faire ?';
      modal.appendChild(message);
      // Buttons
      const btnSave = document.createElement('button'); btnSave.innerText = 'Terminer et sauvegarder';
      const btnDelete = document.createElement('button'); btnDelete.innerText = 'Terminer sans sauvegarder';
      const btnCancel = document.createElement('button'); btnCancel.innerText = 'Annuler';
      [btnSave, btnDelete, btnCancel].forEach(btn => { btn.style.margin = '0.5rem'; modal.appendChild(btn); });
      btnSave.onclick = () => { resolve('save'); document.body.removeChild(overlay); };
      btnDelete.onclick = () => { resolve('delete'); document.body.removeChild(overlay); };
      btnCancel.onclick = () => { resolve('cancel'); document.body.removeChild(overlay); };
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
    });
  }
} 