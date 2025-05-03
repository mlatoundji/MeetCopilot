import { callApi } from '../../utils.js';

export class HomePageHistory {
    constructor(app) {
        this.app = app;
        this.meetingsApiUrl = app.MEETINGS_API_URL;
        this.meetings = [];
        this.init();
    }

    async init() {
        try {
            if (!this.app || !this.app.MEETINGS_API_URL) {
                throw new Error('App instance or MEETINGS_API_URL not properly initialized');
            }

            const response = await callApi(`${this.app.MEETINGS_API_URL}?saveMethod=local`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.success) {
                throw new Error(response.error || 'Failed to load meetings');
            }

            this.meetings = response.data;
        } catch (error) {
            console.error('Error loading meetings:', error);
            this.showError(error.message);
        }
    }

    render() {

        const container = document.querySelector('.main-content');
        if (!container) return;

        // Get current theme
        const isDarkTheme = this.app.ui.theme === 'dark';
        
        const list = document.createElement('div');
        list.className = 'meetings-list';

        if (this.meetings.length === 0) {
            list.innerHTML = '<div class="no-meetings">No meetings found</div>';
        } else {
            this.meetings.forEach(meeting => {
                const item = document.createElement('div');
                item.className = `meeting-item`;
                item.innerHTML = `
                    <div class="meeting-info">
                        <h3 class="meeting-title">${meeting.title || 'Unknown'}</h3>
                        <p class="meeting-id">${meeting.id}</p>
                        <div class="meeting-meta">
                            <span class="date">${new Date(meeting.metadata.startTime).toLocaleString()}</span>
                            <span class="duration">Duration: ${this.formatDuration(meeting.metadata.duration)}</span>
                            <span class="save-method ${meeting.metadata.saveMethod}">${meeting.metadata.saveMethod === 'local' ? 'Local' : 'Cloud'}</span>
                        </div>
                    </div>
                `;
                item.addEventListener('click', () => this.navigateToMeeting(meeting.id));
                list.appendChild(item);
            });
        }

        container.innerHTML = '';
        container.appendChild(list);

        // Add styles dynamically (to avoid duplicate insertion, check id)
        if (!document.getElementById('home-history-styles')) {
            const style = document.createElement('style');
            style.id = 'home-history-styles';
            style.textContent = `
                .main-content {
                    overflow: hidden;
                }
                .meetings-list {
                     padding: 20px;
                     gap: 20px;
                     display: flex;
                     flex-direction: column;
                     max-height: calc(100vh - 150px);
                     overflow-y: auto;
                }
                .meetings-list::-webkit-scrollbar {
                    width: 8px;
                }
                .meetings-list::-webkit-scrollbar-track {
                    background: ${isDarkTheme ? '#1a1a1a' : '#f1f1f1'};
                    border-radius:4px;
                }
                .meetings-list::-webkit-scrollbar-thumb {
                    background: ${isDarkTheme ? '#4a9eff' : '#4285f4'};
                    border-radius:4px;
                }
                .meeting-item {
                    padding: 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    background: ${isDarkTheme ? '#2d2d2d' : '#ffffff'};
                    border-left:4px solid ${isDarkTheme ? '#4a9eff' : '#2196f3'};
                }
                .meeting-item:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .meeting-info h3 {
                    margin: 0 0 8px 0;
                    font-size: 1.2em;
                }
                .meeting-id {
                    font-size: 0.9em;
                    color: #666;
                    margin: 4px 0;
                }
                .meeting-meta {
                    display: flex;
                    gap: 15px;
                    font-size: 0.9em;
                    margin-top: 10px;
                }
                .save-method {
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 0.8em;
                }
                .save-method.local {
                    background: #e3f2fd;
                    color: #1976d2;
                }
                .save-method.cloud {
                    background: #e8f5e9;
                    color: #2e7d32;
                }
                .no-meetings {
                    text-align: center;
                    padding: 40px;
                    color: #666;
                    font-size: 1.1em;
                }
            `;
            document.head.appendChild(style);
        }

        // Setup search bar events again because main content replaced
        this.setupSearch();
    }

    setupSearch() {
        const searchInput = document.querySelector('.search-input');
        const searchButton = document.querySelector('.search-button');

        if (searchInput && searchButton) {
            const performSearch = () => {
                const query = searchInput.value.toLowerCase();
                const filteredMeetings = this.meetings.filter(meeting => {
                    const companyName = (meeting.metadata.meetingInfo?.companyName || '').toLowerCase();
                    const meetingId = meeting.id.toLowerCase();
                    return companyName.includes(query) || meetingId.includes(query);
                });

                const container = document.querySelector('.meetings-list');
                if (container) {
                    if (filteredMeetings.length === 0) {
                        container.innerHTML = '<div class="no-meetings">No meetings match your search</div>';
                    } else {
                        container.innerHTML = '';
                        filteredMeetings.forEach(meeting => {
                            const item = document.createElement('div');
                            item.className = 'meeting-item';
                            item.innerHTML = `
                                <div class="meeting-info">
                                    <h3>${meeting.metadata.meetingInfo?.companyName || 'Unknown'}</h3>
                                    <p class="meeting-id">${meeting.id}</p>
                                    <div class="meeting-meta">
                                        <span class="date">${new Date(meeting.metadata.startTime).toLocaleString()}</span>
                                        <span class="duration">Duration: ${this.formatDuration(meeting.metadata.duration)}</span>
                                        <span class="save-method ${meeting.metadata.saveMethod}">${meeting.metadata.saveMethod === 'local' ? 'Local' : 'Cloud'}</span>
                                    </div>
                                </div>`;
                            item.addEventListener('click', () => this.navigateToMeeting(meeting.id));
                            container.appendChild(item);
                        });
                    }
                }
            };

            searchButton.addEventListener('click', performSearch);
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });
        }
    }

    formatDuration(duration) {
        const hours = Math.floor(duration / 3600000);
        const minutes = Math.floor((duration % 3600000) / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    navigateToMeeting(meetingId) {
        window.location.hash = `#/meeting/${meetingId}`;
    }

    showError(message) {
        const container = document.querySelector('.main-content');
        if (!container) return;
        container.innerHTML = `<div class="error-message"><h2>Error</h2><p>${message}</p></div>`;
    }
} 