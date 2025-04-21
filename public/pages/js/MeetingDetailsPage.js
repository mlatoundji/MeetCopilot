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
        const header = document.createElement('div');
        header.className = 'meeting-header';
        header.innerHTML = `
            <h1>${this.meetingData.title || 'Unknown'}</h1>
            <div class="meeting-meta">
                <span class="date">${new Date(this.meetingData.metadata.startTime).toLocaleString()}</span>
                <span class="duration">Duration: ${this.formatDuration(this.meetingData.metadata.duration)}</span>
                <span class="save-method">${this.meetingData.metadata.saveMethod === 'local' ? 'Local' : 'Cloud'}</span>
            </div>`;
        const timeline = document.createElement('div');
        timeline.className = 'meeting-timeline';
        const events = [
            ...(this.meetingData.dialogs || []).map(d => ({ type: 'dialog', time: d.time, data: d })),
            ...(this.meetingData.summaries || []).map(s => ({ type: 'summary', time: s.time, data: s })),
            ...(this.meetingData.suggestions || []).map(su => ({ type: 'suggestion', time: su.time, data: su }))
        ].sort((a,b)=> new Date(a.time)-new Date(b.time));
        events.forEach(event => {
            const el = document.createElement('div');
            el.className = `timeline-event ${event.type}`;
            if(event.type==='dialog') {
                el.innerHTML = `<div class="speaker">${event.data.speaker}</div><div class="content">${event.data.text}</div><div class="time">${new Date(event.time).toLocaleTimeString()}</div>`;
            } else {
                el.innerHTML = `<div class="content">${event.data.text}</div><div class="time">${new Date(event.time).toLocaleTimeString()}</div>`;
            }
            timeline.appendChild(el);
        });
        const nav = document.createElement('div');
        nav.className = 'meeting-navigation';
        nav.innerHTML = `<button class="back-button" onclick="window.location.hash='home'">Return Home</button>`;
        container.innerHTML = '';
        container.appendChild(header);
        container.appendChild(timeline);
        container.appendChild(nav);
        this.addStyles();
    }

    formatDuration(duration) {
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