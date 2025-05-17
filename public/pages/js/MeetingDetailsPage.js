import { callApi } from '../../utils.js';

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
            const apiUrl = `${this.meetingsApiUrl}/${this.meetingId}?saveMethod=local`;
            const response = await callApi(apiUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            if (!response.success) throw new Error(response.error || 'Failed to load meeting data');
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

        // Clear container safely
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        // Create header section
        const header = document.createElement('div');
        header.className = 'meeting-header';

        // Create and append title
        const title = document.createElement('h1');
        title.textContent = this.meetingData?.title || 'Unknown';
        header.appendChild(title);

        // Create and append metadata section
        const metaContainer = document.createElement('div');
        metaContainer.className = 'meeting-meta';

        // Add date if available
        if (this.meetingData?.metadata?.startTime) {
            const dateSpan = document.createElement('span');
            dateSpan.className = 'date';
            dateSpan.textContent = new Date(this.meetingData.metadata.startTime).toLocaleString();
            metaContainer.appendChild(dateSpan);
        }

        // Add duration if available
        if (this.meetingData?.metadata?.duration) {
            const durationSpan = document.createElement('span');
            durationSpan.className = 'duration';
            durationSpan.textContent = `Duration: ${this.formatDuration(this.meetingData.metadata.duration)}`;
            metaContainer.appendChild(durationSpan);
        }

        // Add save method if available
        if (this.meetingData?.metadata?.saveMethod) {
            const saveMethodSpan = document.createElement('span');
            saveMethodSpan.className = 'save-method';
            saveMethodSpan.textContent = this.meetingData.metadata.saveMethod === 'local' ? 'Local' : 'Cloud';
            metaContainer.appendChild(saveMethodSpan);
        }

        header.appendChild(metaContainer);

        // Create timeline section
        const timeline = document.createElement('div');
        timeline.className = 'meeting-timeline';

        // Create and sort events
        const events = [
            ...(this.meetingData?.dialogs || []).map(d => ({ type: 'dialog', time: d.time, data: d })),
            ...(this.meetingData?.summaries || []).map(s => ({ type: 'summary', time: s.time, data: s })),
            ...(this.meetingData?.suggestions || []).map(su => ({ type: 'suggestion', time: su.time, data: su }))
        ].sort((a, b) => new Date(a.time) - new Date(b.time));

        // Create timeline events
        events.forEach(event => {
            const eventEl = document.createElement('div');
            eventEl.className = `timeline-event ${event.type}`;

            if (event.type === 'dialog') {
                const speakerEl = document.createElement('div');
                speakerEl.className = 'speaker';
                speakerEl.textContent = event.data.speaker || 'Unknown Speaker';
                eventEl.appendChild(speakerEl);
            }

            const contentEl = document.createElement('div');
            contentEl.className = 'content';
            contentEl.textContent = event.data.text || '';
            eventEl.appendChild(contentEl);

            const timeEl = document.createElement('div');
            timeEl.className = 'time';
            timeEl.textContent = new Date(event.time).toLocaleTimeString();
            eventEl.appendChild(timeEl);

            timeline.appendChild(eventEl);
        });

        // Create navigation section
        const nav = document.createElement('div');
        nav.className = 'meeting-navigation';

        const backButton = document.createElement('button');
        backButton.className = 'back-button';
        backButton.textContent = 'Return Home';
        backButton.addEventListener('click', () => {
            window.location.hash = 'home';
        });
        nav.appendChild(backButton);

        // Append all sections to container
        container.appendChild(header);
        container.appendChild(timeline);
        container.appendChild(nav);

        this.addStyles();
    }

    formatDuration(duration) {
        if (!duration || isNaN(duration)) return '';
        const hours = Math.floor(duration / 3600000);
        const minutes = Math.floor((duration % 3600000) / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        return `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
    }

    showError(msg){
        const container=document.querySelector('.main-content');
        if(container) container.innerHTML=`<div class='error-message'><h2>Error</h2><p>${msg}</p></div>`;
    }

    addStyles() {
        const isDarkTheme = this.app.ui.theme === 'dark';
        if (document.getElementById('meeting-details-styles')) return;
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
            }
            .meeting-meta {
                display:flex;
                gap:15px;
                font-size:0.9em;
                color:#777;
            }
            .meeting-timeline {
                padding:0 20px;
                max-height: calc(100vh - 220px);
                overflow-y: auto;
            }
            .meeting-timeline::-webkit-scrollbar {width:8px;}
            .meeting-timeline::-webkit-scrollbar-track {background:${isDarkTheme ? '#1a1a1a' : '#f1f1f1'};border-radius:4px;}
            .meeting-timeline::-webkit-scrollbar-thumb {background:${isDarkTheme ? '#4a9eff' : '#4285f4'};border-radius:4px;}
            .timeline-event {
                margin-bottom:15px;
                padding:15px;
                border-radius:8px;
                background:${isDarkTheme ? '#2d2d2d' : '#ffffff'};
                box-shadow:0 2px 4px rgba(0,0,0,0.1);
                position:relative;
            }
            .timeline-event.dialog {border-left:4px solid ${isDarkTheme ? '#4a9eff':'#2196f3'};}
            .timeline-event.summary {border-left:4px solid ${isDarkTheme ? '#34a853':'#4caf50'};}
            .timeline-event.suggestion {border-left:4px solid ${isDarkTheme ? '#fbbc04':'#ff9800'};}
            .timeline-event .speaker {font-weight:bold;margin-bottom:5px;}
            .timeline-event .time {position:absolute;top:8px;right:10px;font-size:0.75em;color:#888;}
        `;
        document.head.appendChild(style);
    }
} 