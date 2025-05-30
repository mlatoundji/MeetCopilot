import { callApi } from '../../utils.js';

export class HomePageSessionsHistoryPage {
    constructor(app) {
        this.app = app;
        this.apiHandler = this.app.apiHandler;
        this.sessionsApiUrl = `${this.apiHandler.baseURL}${this.apiHandler.apiPrefix}/sessions`;
        this.sessions = [];
        this.filteredSessions = [];
    }

    async init() {
        try {
            console.log("Loading session history...");

            // Fetch sessions via APIHandler
            const result = await this.app.apiHandler.getSessions();
            console.log(`${result.data.length} sessions loaded in history`, result);

            if (result && Array.isArray(result.data)) {
                this.sessions = result.data;
                this.filteredSessions = [...this.sessions];
                console.log(`${this.sessions.length} sessions loaded in history`);
            } else {
                console.error("Error loading sessions:", result.error || "Invalid response format");
            }
        } catch (error) {
            console.error("Error initializing sessions history:", error);
        }
        this.bindEvents();
        this.render();
    }

    render() {
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) {
            console.error("Element .main-content not found");
            return;
        }

        mainContent.innerHTML = '';
        const fragment = document.createDocumentFragment();
        fragment.appendChild(this.createTitleElement());
        fragment.appendChild(this.createSearchBar());

        if (!this.filteredSessions || this.filteredSessions.length === 0) {
            fragment.appendChild(this.createNoSessionsMessage());
            mainContent.appendChild(fragment);
            return;
        }

        const sessionsContainer = document.createElement('div');
        sessionsContainer.className = 'meetings-list';
        this.filteredSessions.forEach(session => {
            const card = this.createSessionCard(session);
            sessionsContainer.appendChild(card);
        });
        fragment.appendChild(sessionsContainer);
        mainContent.appendChild(fragment);
    }

    createTitleElement() {
        const titleElement = document.createElement('h1');
        titleElement.className = 'page-title';
        titleElement.textContent = 'Sessions History';
        return titleElement;
    }

    createSearchBar() {
        const searchBar = document.createElement('div');
        searchBar.className = 'search-bar';
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'search-input';
        searchInput.placeholder = 'Search...';
        const searchButton = document.createElement('button');
        searchButton.className = 'search-button';
        searchButton.textContent = '🔍';
        searchBar.appendChild(searchInput);
        searchBar.appendChild(searchButton);
        return searchBar;
    }

    createNoSessionsMessage() {
        const msg = document.createElement('div');
        msg.className = 'no-meetings-message';
        msg.innerHTML = `<h2>No sessions found</h2><p>You have not recorded any sessions yet.</p>`;
        return msg;
    }

    createSessionCard(session) {
        const card = document.createElement('div');
        card.className = 'meeting-card';
        card.setAttribute('data-session-id', session.id);
        card.addEventListener('click', () => this.showSessionDetails(session));

        let dateStr = session.metadata?.startTime ? new Date(session.metadata.startTime).toLocaleDateString() + ', ' + new Date(session.metadata.startTime).toLocaleTimeString() : 'Date inconnue';
        let durationStr = 'Durée inconnue';
        if (session.metadata?.duration != null) {
            const d = session.metadata.duration;
            const h = Math.floor(d/3600).toString().padStart(2,'0');
            const m = Math.floor((d%3600)/60).toString().padStart(2,'0');
            const s = Math.floor(d%60).toString().padStart(2,'0');
            durationStr = `${h}:${m}:${s}`;
        }

        let summaryText = 'Aucun contenu disponible';
        if (session.summaries?.length) {
            summaryText = session.summaries[0].text.substring(0,150) + '...';
        }

        card.innerHTML = `
            <div class="meeting-card-header"><h3>${session.session_title || 'Sans titre'}</h3></div>
            <div class="meeting-card-body">
                <div class="meeting-date">${dateStr}</div>
                <div class="meeting-duration">Durée: ${durationStr}</div>
                <div class="meeting-summary">${summaryText}</div>
            </div>
            <div class="meeting-footer">
                <span class="meeting-type">${session.status}</span>
                <span class="meeting-action">Voir les détails →</span>
            </div>`;
        return card;
    }

    showSessionDetails(session) {
        window.location.hash = `/sessions/${session.id}`;
    }

    bindEvents() {
        const inp = document.querySelector('.search-input');
        const btn = document.querySelector('.search-button');
        if (inp) inp.addEventListener('input', () => this.handleSearch());
        if (btn) btn.addEventListener('click', () => this.handleSearch());
    }

    handleSearch() {
        const q = (document.querySelector('.search-input')?.value || '').toLowerCase();
        this.filteredSessions = q ? this.sessions.filter(s => s.session_title?.toLowerCase().includes(q)) : [...this.sessions];
        this.updateList();
    }

    updateList() {
        const container = document.querySelector('.meetings-list');
        container.innerHTML = '';
        this.filteredSessions.forEach(s => container.appendChild(this.createSessionCard(s)));
    }

}

export default HomePageSessionsHistoryPage; 