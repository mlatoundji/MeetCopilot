// Removed unused callApi import; using APIHandler for meeting data
// export class HomePageHistory {
export class HomePageHistory {
    constructor(app) {
        this.app = app;
        this.apiHandler = this.app?.apiHandler;
        this.meetingsApiUrl = `${this.apiHandler?.baseURL || 'http://localhost:3000'}/api/meetings`;
        this.meetings = [];
        this.filteredMeetings = [];
    }

    async init() {
        try {
            console.log("Loading meeting history...");
            
            // Fetch meetings via APIHandler
            const result = await this.app.apiHandler.getMeetings('local');
            
            console.log(`${result.data.length} meetings loaded in history`, result);

            if (result.success && Array.isArray(result.data)) {
                this.meetings = result.data;
                this.filteredMeetings = [...this.meetings];
                console.log(`${this.meetings.length} meetings loaded in history`);
            } else {
                console.error("Error loading meetings:", result.error || "Invalid response format");
            }
        } catch (error) {
            console.error("Error initializing history:", error);
        }
        // Bind search events
        this.bindEvents();
        // After binding, render the history UI
        this.render();
    }

    render() {
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) {
            console.error("Element .main-content not found");
            return;
        }

        // Clear existing content
        mainContent.innerHTML = '';

        // Create a fragment to group elements
        const fragment = document.createDocumentFragment();

        // Add a title to the page
        fragment.appendChild(this.createTitleElement());

        // Create the search bar
        fragment.appendChild(this.createSearchBar());

        // If no meetings are available
        if (!this.filteredMeetings || this.filteredMeetings.length === 0) {
            fragment.appendChild(this.createNoMeetingsMessage());
            mainContent.appendChild(fragment);
            return;
        }

        // Create a container for meeting cards
        const meetingsContainer = document.createElement('div');
        meetingsContainer.className = 'meetings-list';
        
        // Render filtered meetings
        this.filteredMeetings.forEach(meeting => {
            const card = this.createMeetingCard(meeting);
            meetingsContainer.appendChild(card);
        });

        fragment.appendChild(meetingsContainer);
        mainContent.appendChild(fragment);
    }

    createTitleElement() {
        const titleElement = document.createElement('h1');
        titleElement.className = 'page-title';
        titleElement.textContent = 'Meeting History';
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

    createNoMeetingsMessage() {
        const noMeetingsMessage = document.createElement('div');
        noMeetingsMessage.className = 'no-meetings-message';
        noMeetingsMessage.innerHTML = `
            <h2>No meetings found</h2>
            <p>You have not recorded any meetings yet.</p>
        `;
        return noMeetingsMessage;
    }

    createMeetingCard(meeting) {
        const card = document.createElement('div');
        card.className = 'meeting-card';
        card.setAttribute('data-meeting-id', meeting.id || meeting.metadata?.id);
        
        // Formater la date et la durée
        let dateStr = "Date inconnue";
        let durationStr = "Durée inconnue";
        
        if (meeting.metadata?.startTime) {
            const date = new Date(meeting.metadata.startTime);
            dateStr = date.toLocaleDateString() + ', ' + date.toLocaleTimeString();
        }
        
        if (meeting.metadata?.duration) {
            const duration = meeting.metadata.duration;
            const hours = Math.floor(duration / 3600).toString().padStart(2, '0');
            const minutes = Math.floor((duration % 3600) / 60).toString().padStart(2, '0');
            const seconds = Math.floor(duration % 60).toString().padStart(2, '0');
            durationStr = `${hours}:${minutes}:${seconds}`;
        }
        
        // Obtenir un résumé ou extrait de la transcription
        let summaryText = "Aucun contenu disponible";
        if (meeting.summaries && meeting.summaries.length > 0 && meeting.summaries[0].text) {
            summaryText = meeting.summaries[0].text.substr(0, 150) + '...';
        } else if (meeting.dialogs && meeting.dialogs.length > 0) {
            const transcription = meeting.dialogs.map(dialog => dialog.text).join(' ');
            summaryText = "Points clés : " + transcription.substr(0, 150) + '...';
        }
        
        // Construire le HTML de la carte
        const header = document.createElement('div');
        header.className = 'meeting-card-header';
        const title = document.createElement('h3');
        title.textContent = meeting.title || "Réunion sans titre";
        header.appendChild(title);
        
        const body = document.createElement('div');
        body.className = 'meeting-card-body';
        const date = document.createElement('div');
        date.className = 'meeting-date';
        date.textContent = dateStr;
        const duration = document.createElement('div');
        duration.className = 'meeting-duration';
        duration.textContent = `Durée: ${durationStr}`;
        const summary = document.createElement('div');
        summary.className = 'meeting-summary';
        summary.textContent = summaryText;
        body.appendChild(date);
        body.appendChild(duration);
        body.appendChild(summary);
        
        const footer = document.createElement('div');
        footer.className = 'meeting-footer';
        const type = document.createElement('div');
        type.className = 'meeting-type';
        type.textContent = meeting.metadata?.source || "Local";
        const action = document.createElement('div');
        action.className = 'meeting-action';
        action.textContent = 'Voir les détails →';
        footer.appendChild(type);
        footer.appendChild(action);
        
        card.appendChild(header);
        card.appendChild(body);
        card.appendChild(footer);
        
        // Ajouter un gestionnaire d'événements pour naviguer vers la page de détails
        card.addEventListener('click', () => this.showMeetingDetails(meeting));
        
        return card;
    }

    // Fonction pour naviguer vers la page de détails de la réunion
    showMeetingDetails(meeting) {
        const meetingId = meeting.id || meeting.metadata?.id;
        if (!meetingId) {
            console.error("Impossible d'afficher les détails: ID de réunion manquant");
            return;
        }
        
        console.log(`Navigation vers la réunion ${meetingId}: ${meeting.title || "Sans titre"}`);
        
        // Utiliser le hash pour la navigation
        window.location.hash = `/meeting/${meetingId}`;
    }

    bindEvents() {
        const searchInput = document.querySelector('.search-input');
        const searchButton = document.querySelector('.search-button');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.handleSearch());
        }
        if (searchButton) {
            searchButton.addEventListener('click', () => this.handleSearch());
        }
    }

    handleSearch() {
        const query = (document.querySelector('.search-input')?.value || '').toLowerCase();
        
        // Calculate new filtered results
        const newFilteredMeetings = !query ? 
            [...this.meetings] : 
            this.meetings.filter(meeting => {
                if (meeting.title?.toLowerCase().includes(query)) return true;
                if (meeting.summaries?.some(s => s.text.toLowerCase().includes(query))) return true;
                if (meeting.dialogs?.some(d => d.text.toLowerCase().includes(query))) return true;
                return false;
            });
        
        // Compare arrays to check if they're different
        const hasChanged = this.filteredMeetings.length !== newFilteredMeetings.length ||
            newFilteredMeetings.some((meeting, index) => {
                const currentMeeting = this.filteredMeetings[index];
                return !currentMeeting || 
                       meeting.id !== currentMeeting.id || 
                       meeting.metadata?.id !== currentMeeting.metadata?.id;
            });
        
        // Only update and render if there's a change
        if (hasChanged) {
            this.filteredMeetings = newFilteredMeetings;
            this.updateMeetingsList();
        }
    }

    updateMeetingsList() {
        const meetingsContainer = document.querySelector('.meetings-list');
        if (!meetingsContainer) return;

        // Clear existing content
        meetingsContainer.innerHTML = '';

        // Render filtered meetings
        this.filteredMeetings.forEach(meeting => {
            const card = this.createMeetingCard(meeting);
            meetingsContainer.appendChild(card);
        });
    }
}

// Export default for Router compatibility
export default HomePageHistory; 