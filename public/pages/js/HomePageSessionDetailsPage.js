import { meetingFieldsConfig } from '../../resources/meetingFieldsConfig.js';

export class HomePageSessionDetailsPage {
    constructor(sessionId, sessionsApiUrl, app) {
        this.sessionId = sessionId;
        this.sessionsApiUrl = sessionsApiUrl;
        this.meetingData = null;
        this.dialogs = [];
        this.suggestions = [];
        this.fullSummaries = [];
        this.app = app;
    }

    async init() {
        // Cleanup any previous session details styles to prevent duplication
        this.cleanupStyles();
        // Show loading indicator
        const container = document.querySelector('.main-content');
        if (container) {
            // Clear previous content
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading-message';
            loadingDiv.textContent = 'Loading session details...';
            container.appendChild(loadingDiv);
        }
        try {
            console.log(`Fetching session details for ID: ${this.sessionId}`);
            // Use APIHandler to include Authorization header
            const result = await this.app.apiHandler.getSession(this.sessionId);
            if (!result || result.data == null) throw new Error('Failed to load session data');
            // Store session data
            this.meetingData = result.data;
            // Fetch conversation messages
            const sessionId = this.meetingData.id;
            const convId = this.meetingData.conversation_id;
            if (convId) {
                try {
                    const convResp = await this.app.apiHandler.callApi(
                        `${this.app.apiHandler.baseURL}${this.app.apiHandler.apiPrefix}/conversation/${convId}`,
                        { method: 'GET' }
                    );
                    // Normalize response envelope for conversation
                    let convPayload = convResp;
                    if (convResp.data) convPayload = convResp.data;
                    const mem = convPayload.memory_json || convPayload;
                    this.dialogs = Array.isArray(mem.messages)
                        ? mem.messages
                        : Array.isArray(mem)
                            ? mem
                            : [];
                } catch (e) {
                    console.error('Error fetching conversation messages:', e);
                    this.dialogs = [];
                }
                // Fetch suggestions
                try {
                    const sugResp = await this.app.apiHandler.callApi(
                        `${this.app.apiHandler.baseURL}${this.app.apiHandler.apiPrefix}/suggestions/load?session_id=${sessionId}&conversation_id=${convId}`,
                        { method: 'GET' }
                    );
                    // Normalize response envelope for suggestions
                    let sugPayload = sugResp;
                    if (sugResp.data) sugPayload = sugResp.data;
                    this.suggestions = Array.isArray(sugPayload.suggestions)
                        ? sugPayload.suggestions
                        : [];
                } catch (e) {
                    console.error('Error fetching suggestions:', e);
                    this.suggestions = [];
                }
                // Fetch detailed summary
                try {
                    const detResp = await this.app.apiHandler.callApi(
                        `${this.app.apiHandler.baseURL}${this.app.apiHandler.apiPrefix}/summary/detailed?session_id=${sessionId}&conversation_id=${convId}`,
                        { method: 'GET' }
                    );
                    // Normalize response envelope and formats for detailed summaries
                    let detPayload = detResp;
                    if (detResp.data) detPayload = detResp.data;
                    if (Array.isArray(detPayload.summaries)) {
                        this.fullSummaries = detPayload.summaries;
                    } else if (Array.isArray(detPayload.summary)) {
                        this.fullSummaries = detPayload.summary;
                    } else if (typeof detPayload.summary === 'string') {
                        this.fullSummaries = [detPayload.summary];
                    } else {
                        this.fullSummaries = [];
                    }
                } catch (e) {
                    console.error('Error fetching detailed summary:', e);
                    this.fullSummaries = [];
                }
            }
            this.render();
        } catch (error) {
            console.error('Error loading session details:', error);
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
        title.textContent = this.meetingData?.session_title || 'Unknown';
        header.appendChild(title);

        // Create and append metadata section
        const metaContainer = document.createElement('div');
        metaContainer.className = 'meeting-meta';

        // Add date if available
        if (this.meetingData?.start_time) {
            const dateSpan = document.createElement('span');
            dateSpan.className = 'date';
            dateSpan.textContent = new Date(this.meetingData.start_time).toLocaleString();
            metaContainer.appendChild(dateSpan);
        }

        // Add duration if available
        if (this.meetingData?.end_time) {
            const durationMs = new Date(this.meetingData.end_time).getTime() - new Date(this.meetingData.start_time).getTime();
            const durationSpan = document.createElement('span');
            durationSpan.className = 'duration';
            durationSpan.textContent = `Durée: ${this.formatDuration(durationMs)}`;
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

        // Append header to container
        container.appendChild(header);
        // Add session description if available
        if (this.meetingData.description) {
            const descEl = document.createElement('div');
            descEl.className = 'session-description';
            descEl.textContent = this.meetingData.description;
            container.appendChild(descEl);
        }
        // Add custom context fields
        const contextData = this.meetingData.custom_context || {};
        meetingFieldsConfig.forEach(category => {
            const section = document.createElement('div');
            section.className = 'session-context-section';
            const secTitle = document.createElement('h2');
            secTitle.textContent = category.title;
            section.appendChild(secTitle);
            category.fields.forEach(field => {
                const val = contextData[field.key];
                if (val) {
                    const p = document.createElement('p');
                    p.innerHTML = `<strong>${field.label}:</strong> ${val}`;
                    section.appendChild(p);
                }
            });
            container.appendChild(section);
        });
        // Transcription section: display conversation messages and suggestions as styled cards
        const transSection = document.createElement('div');
        transSection.className = 'session-transcription-section';
        const transTitle = document.createElement('h2');
        transTitle.textContent = 'Transcription';
        transSection.appendChild(transTitle);
        const transContainer = document.createElement('div');
        transContainer.className = 'transcription-cards';
        // Merge dialogs and suggestions chronologically
        const combined = [];
        let remainingSugs = [...this.suggestions];
        this.dialogs.forEach(dialog => {
            combined.push({ type: 'dialog', data: dialog });
            const afterId = dialog.id;
            const matched = remainingSugs.filter(su => su.generated_after_dialog_id === afterId);
            matched.forEach(su => combined.push({ type: 'suggestion', data: su }));
            remainingSugs = remainingSugs.filter(su => su.generated_after_dialog_id !== afterId);
        });
        // Append any suggestions without matching dialog
        remainingSugs.forEach(su => combined.push({ type: 'suggestion', data: su }));
        // Render combined items
        combined.forEach(item => {
            if (item.type === 'dialog') {
                const msg = item.data;
                const card = document.createElement('div');
                card.className = 'transcription-card';
                const speaker = document.createElement('div'); speaker.className = 'speaker'; speaker.textContent = msg.speaker || '';
                const content = document.createElement('div'); content.className = 'content'; content.textContent = msg.text || '';
                const time = document.createElement('div'); time.className = 'time'; time.textContent = new Date(msg.time).toLocaleTimeString();
                card.appendChild(speaker); card.appendChild(content); card.appendChild(time);
                transContainer.appendChild(card);
            } else {
                const su = item.data;
                const card = document.createElement('div');
                card.className = 'suggestion-card';
                const content = document.createElement('div'); content.className = 'content'; content.textContent = su.suggestion_text || su.text || '';
                const time = document.createElement('div'); time.className = 'time';
                if (su.created_at) time.textContent = new Date(su.created_at).toLocaleTimeString();
                card.appendChild(content); card.appendChild(time);
                transContainer.appendChild(card);
            }
        });
        transSection.appendChild(transContainer);
        container.appendChild(transSection);
        // Summary section: display full summaries
        const sumSection = document.createElement('div');
        sumSection.className = 'session-full-summary-section';
        const sumTitle = document.createElement('h2'); sumTitle.textContent = 'Résumé complet'; sumSection.appendChild(sumTitle);
        const sumContent = document.createElement('div'); sumContent.className = 'full-summary';
        const summaryTexts = (this.fullSummaries || []).map(item => {
            // If the summary is a JSON string, parse it
            if (typeof item === 'string') {
                try {
                    const parsed = JSON.parse(item);
                    return parsed.content || parsed.summary_text || item;
                } catch (e) {
                    return item;
                }
            }
            // If it's an object, extract known fields
            if (item && typeof item === 'object') {
                return item.content || item.summary_text || '';
            }
            return '';
        }).join('\n\n');
        sumContent.textContent = summaryTexts;
        sumSection.appendChild(sumContent);
        container.appendChild(sumSection);
        // Navigation section
        const nav = document.createElement('div'); nav.className = 'meeting-navigation';
        const backButton = document.createElement('button'); backButton.className = 'back-button'; backButton.textContent = 'Return Home';
        backButton.addEventListener('click', () => { window.location.hash = 'home'; }); nav.appendChild(backButton);
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
        const container = document.querySelector('.main-content');
        if (container) {
            // Clear existing content
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
            // Create error message elements safely
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            const heading = document.createElement('h2');
            heading.textContent = 'Error';
            errorDiv.appendChild(heading);
            const paragraph = document.createElement('p');
            paragraph.textContent = msg;
            errorDiv.appendChild(paragraph);
            container.appendChild(errorDiv);
        }
    }

    addStyles() {
        const isDarkTheme = this.app?.ui?.theme === 'dark';
        if (document.getElementById('session-details-styles')) return;
        const style = document.createElement('style');
        style.id = 'session-details-styles';
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
            /* Transcription Section Styles */
            .session-transcription-section { margin: 20px 0; }
            .session-transcription-section h2 { margin-left: 20px; color: ${isDarkTheme ? '#fff' : '#000'}; }
            .transcription-cards { display: flex; flex-direction: column; gap: 15px; padding: 0 20px; }
            .transcription-card, .suggestion-card {
                position: relative;
                padding: 15px;
                border-radius: 8px;
                background: ${isDarkTheme ? '#2d2d2d' : '#fafafa'};
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .transcription-card { border-left: 4px solid ${isDarkTheme ? '#4a9eff' : '#2196f3'}; }
            .suggestion-card { border-left: 4px solid ${isDarkTheme ? '#fbbc04' : '#ff9800'}; }
            .transcription-card .speaker { font-weight: bold; margin-bottom: 5px; color: ${isDarkTheme ? '#fff' : '#000'}; }
            .transcription-card .content, .suggestion-card .content { margin-bottom: 8px; color: ${isDarkTheme ? '#ddd' : '#333'}; }
            .transcription-card .time, .suggestion-card .time {
                position: absolute;
                top: 8px;
                right: 10px;
                font-size: 0.8em;
                color: ${isDarkTheme ? '#bbb' : '#666'};
            }
            /* Full Summary Styles */
            .session-full-summary-section { margin: 20px 0; padding: 0 20px; }
            .session-full-summary-section h2 { margin-bottom: 10px; color: ${isDarkTheme ? '#fff' : '#000'}; }
            .full-summary {
                white-space: pre-wrap;
                background: ${isDarkTheme ? '#2d2d2d' : '#ffffff'};
                border-left: 4px solid ${isDarkTheme ? '#34a853' : '#4caf50'};
                border-radius: 8px;
                padding: 15px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                color: ${isDarkTheme ? '#ddd' : '#333'};
                line-height: 1.5;
            }
        `;
        document.head.appendChild(style);
    }

    // Cleanup injected styles to avoid duplication
    cleanupStyles() {
        const styleEl = document.getElementById('session-details-styles');
        if (styleEl) {
            styleEl.remove();
        }
    }
} 