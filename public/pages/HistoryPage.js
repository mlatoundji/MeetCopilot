import { callApi } from '../utils.js';

export class HistoryPage {
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
            this.render();
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
                        <h3 class="meeting-title">${meeting.metadata.meetingInfo?.companyName || 'Unknown'}</h3>
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

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .meeting-title {
                font-size: 1.2em;
                font-weight: bold;
                color: ${isDarkTheme ? '#ffffff' : '#000000'};
            }
            .meetings-list {
                padding: 20px;
                gap: 20px;
                display: flex;
                flex-direction: column;
            }
            .meeting-item {
                padding: 20px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                background: ${isDarkTheme ? '#2d2d2d' : '#ffffff'};
                border: 1px solid ${isDarkTheme ? '#404040' : '#e0e0e0'};
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

        container.innerHTML = `
            <div class="error-message">
                <h2>Error</h2>
                <p>${message}</p>
            </div>
        `;
    }
} 