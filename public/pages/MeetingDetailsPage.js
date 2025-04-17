import { callApi } from '../utils.js';

export class MeetingDetailsPage {
    constructor(meetingId, meetingsApiUrl) {
        this.meetingId = meetingId;
        this.meetingsApiUrl = meetingsApiUrl;
        this.meetingData = null;
    }

    async init() {
        try {
            const response = await callApi(`${this.meetingsApiUrl}/${this.meetingId}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.success) {
                throw new Error(response.error || 'Failed to load meeting data');
            }

            this.meetingData = response.data;
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
            ...this.meetingData.dialogs.map(dialog => ({
                type: 'dialog',
                time: dialog.timestamp,
                data: dialog
            })),
            ...this.meetingData.summaries.map(summary => ({
                type: 'summary',
                time: summary.timestamp,
                data: summary
            })),
            ...this.meetingData.suggestions.map(suggestion => ({
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

        // Clear and update container
        container.innerHTML = '';
        container.appendChild(header);
        container.appendChild(timeline);
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
                <h2>Error</h2>
                <p>${message}</p>
                <button onclick="window.history.back()">Go Back</button>
            </div>
        `;
    }
} 