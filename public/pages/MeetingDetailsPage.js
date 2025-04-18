import { callApi } from '../utils.js';

export class MeetingDetailsPage {
    constructor(meetingId, meetingsApiUrl, app) {
        this.meetingId = meetingId;
        this.meetingsApiUrl = meetingsApiUrl;
        this.meetingData = null;
        this.app = app;
    }

    async init() {
        try {
            console.log(`Fetching meeting details for ID: ${this.meetingId}`);
            
            // Construct the correct URL for fetching a specific meeting
            // Format: baseUrl/meetingId?saveMethod=local
            const apiUrl = `${this.meetingsApiUrl}/${this.meetingId}?saveMethod=local`;
            console.log(`API URL: ${apiUrl}`);
            
            const response = await callApi(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.success) {
                throw new Error(response.error || 'Failed to load meeting data');
            }

            this.meetingData = response.data;
            console.log("Meeting data loaded:", this.meetingData);
            this.render();
        } catch (error) {
            console.error('Error loading meeting details:', error);
            this.showError(error.message);
        }
    }

    render() {
        const container = document.querySelector('.main-content');
        if (!container) return;


        // Create header with meeting info
        const header = document.createElement('div');
        header.className = 'meeting-header';
        header.innerHTML = `
            <h1>${this.meetingData.metadata.meetingInfo?.companyName || 'Unknown'}</h1>
            <div class="meeting-meta">
                <span class="date">${new Date(this.meetingData.metadata.startTime).toLocaleString()}</span>
                <span class="duration">Duration: ${this.formatDuration(this.meetingData.metadata.duration)}</span>
                <span class="save-method">${this.meetingData.metadata.saveMethod === 'local' ? 'Local' : 'Cloud'}</span>
            </div>
        `;

        // Create timeline container
        const timeline = document.createElement('div');
        timeline.className = 'meeting-timeline';

        // Combine and sort all events chronologically
        const events = [
            ...(this.meetingData.dialogs || []).map(dialog => ({
                type: 'dialog',
                time: dialog.timestamp,
                data: dialog
            })),
            ...(this.meetingData.summaries || []).map(summary => ({
                type: 'summary',
                time: summary.timestamp,
                data: summary
            })),
            ...(this.meetingData.suggestions || []).map(suggestion => ({
                type: 'suggestion',
                time: suggestion.timestamp,
                data: suggestion
            }))
        ].sort((a, b) => new Date(a.time) - new Date(b.time));

        // Render each event
        events.forEach(event => {
            const eventElement = document.createElement('div');
            eventElement.className = `timeline-event ${event.type}`;
            
            switch (event.type) {
                case 'dialog':
                    eventElement.innerHTML = `
                        <div class="speaker">${event.data.speaker}</div>
                        <div class="content">${event.data.text}</div>
                        <div class="time">${new Date(event.time).toLocaleTimeString()}</div>
                    `;
                    break;
                case 'summary':
                    eventElement.innerHTML = `
                        <div class="content">${event.data.text}</div>
                        <div class="time">${new Date(event.time).toLocaleTimeString()}</div>
                    `;
                    break;
                case 'suggestion':
                    eventElement.innerHTML = `
                        <div class="content">${event.data.text}</div>
                        <div class="time">${new Date(event.time).toLocaleTimeString()}</div>
                    `;
                    break;
            }

            timeline.appendChild(eventElement);
        });

        // Add navigation button
        const navigation = document.createElement('div');
        navigation.className = 'meeting-navigation';
        navigation.innerHTML = `
            <button class="back-button" onclick="window.location.hash = '#/history'">
                Retour à l'historique
            </button>
        `;

        // Clear and update container
        container.innerHTML = '';
        container.appendChild(header);
        container.appendChild(timeline);
        container.appendChild(navigation);

        // Add styles if needed
        this.addStyles();
    }

    addStyles() {
        const isDarkTheme = this.app.ui.theme === 'dark';
        if (!document.getElementById('meeting-details-styles')) {
            const style = document.createElement('style');
            style.id = 'meeting-details-styles';
            style.textContent = `
                .meeting-header {
                    padding: 20px;
                    margin-bottom: 20px;
                    border-bottom: 1px solid #eee;
                }
                .meeting-header h1 {
                    margin: 0 0 10px 0;
                    font-size: 1.8em;
                }
                .meeting-meta {
                    display: flex;
                    gap: 15px;
                    font-size: 0.9em;
                    color: #666;
                }
                .meeting-timeline {
                    padding: 0 20px;
                }
                .timeline-event {
                    padding: 15px;
                    margin-bottom: 15px;
                    border-radius: 8px;
                    position: relative;
                    ${isDarkTheme ? 'background-color: #2c2c2c;' : 'background-color: #f0f7ff;'}
                }
                .timeline-event.dialog {
                    background: #f0f7ff;
                    border-left: 4px solid #4285f4;
                    ${isDarkTheme ? 'background-color: #2c2c2c;' : 'background-color: #f0f7ff;'}
                }
                .timeline-event.summary {
                    background: #fdf8e9;
                    border-left: 4px solid #fbbc04;
                    ${isDarkTheme ? 'background-color: #2c2c2c;' : 'background-color: #f0f7ff;'}
                }
                .timeline-event.suggestion {
                    background: #f1f8f1;
                    border-left: 4px solid #34a853;
                    ${isDarkTheme ? 'background-color: #2c2c2c;' : 'background-color: #f0f7ff;'}
                .timeline-event .speaker {
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .timeline-event .content {
                    line-height: 1.5;
                }
                .timeline-event .time {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    font-size: 0.8em;
                    color: #666;
                }
                .meeting-navigation {
                    padding: 20px;
                    display: flex;
                    justify-content: center;
                }
                .back-button {
                    padding: 8px 16px;
                    background: #4285f4;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                .back-button:hover {
                    background: #3367d6;
                }
                .error-message {
                    padding: 20px;
                    text-align: center;
                }
                .error-message h2 {
                    color: #d32f2f;
                }
                .loading {
                    padding: 40px;
                    text-align: center;
                    font-size: 1.2em;
                    color: #666;
                }
            `;
            document.head.appendChild(style);
        }
    }

    formatDuration(duration) {
        const hours = Math.floor(duration / 3600000);
        const minutes = Math.floor((duration % 3600000) / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    showError(message) {
        const container = document.querySelector('.main-content');
        if (!container) return;

        container.innerHTML = `
            <div class="error-message">
                <h2>Erreur</h2>
                <p>${message}</p>
                <button onclick="window.location.hash = '#/history'" class="back-button">Retour à l'historique</button>
            </div>
        `;
    }
} 