import { callApi } from '../utils.js';

export class BackupHandler {
    constructor(meetingsApiUrlOrAppWithApiHandler, app = null) {
        if (typeof meetingsApiUrlOrAppWithApiHandler === 'string') {
            this.meetingsApiUrl = meetingsApiUrlOrAppWithApiHandler;
            this.apiHandler = app?.apiHandler || null;
            this.app = app;
        } else {
            this.app = meetingsApiUrlOrAppWithApiHandler;
            this.apiHandler = this.app?.apiHandler;
            this.meetingsApiUrl = this.app?.MEETINGS_API_URL || `${this.apiHandler?.baseURL || 'http://localhost:3000'}/api/meetings`;
        }
        
        this.meetingData = {
            id: null,
            title: '',
            transcription: '',
            dialogs: [],
            suggestions: [],
            summaries: [],
            metadata: {
                startTime: null,
                endTime: null,
                duration: null,
                participants: [],
            }
        };
        // this.autoSaveInterval = null;
        // this.startAutoSave();
    }

    showSaveMethodModal() {
        const modal = document.getElementById('saveMethodModal');
        const overlay = document.getElementById('modalOverlay');
        modal.style.display = 'block';
        overlay.style.display = 'block';

        return new Promise((resolve) => {
            document.getElementById('localSaveButton').onclick = () => {
                modal.style.display = 'none';
                overlay.style.display = 'none';
                resolve('local');
            };

            document.getElementById('supabaseSaveButton').onclick = () => {
                modal.style.display = 'none';
                overlay.style.display = 'none';
                resolve('supabase');
            };

            document.getElementById('closeSaveMethodButton').onclick = () => {
                modal.style.display = 'none';
                overlay.style.display = 'none';
                resolve(null);
            };
        });
    }

    async saveMeetingData() {
        try {
            const saveMethod = await this.showSaveMethodModal();
            if (!saveMethod) return { success: false, message: 'Save cancelled' };

            const lastSummary = await this.app.conversationContextHandler.generateSummary(this.app.conversationContextHandler.conversationContextText);
            if (lastSummary != null) {
              this.app.conversationContextHandler.conversationContextSummaries.push({text: lastSummary, time: Date.now(), language: this.app.currentLanguage});
            }
            // Finalize and save meeting data
            for (let i = 0; i < this.app.conversationContextHandler.conversationContextDialogs.length; i++) {
              this.addDialog(this.app.conversationContextHandler.conversationContextDialogs[i]);
            }
            for (let i = 0; i < this.app.conversationContextHandler.conversationContextSummaries.length; i++) {
              this.addSummary(this.app.conversationContextHandler.conversationContextSummaries[i]);
            }
            for (let i = 0; i < this.app.conversationContextHandler.conversationContextSuggestions.length; i++) {
              this.addSuggestion(this.app.conversationContextHandler.conversationContextSuggestions[i]);
            }
            
        
            this.finalizeMeeting();

            const title = document.getElementById('saveTitleInput').value;
            if (!title) return { success: false, message: 'Title is required' };

            this.meetingData.id = this.meetingData.id || Date.now().toString();
            this.meetingData.title = title;

            // Ensure data is properly formatted
            const formattedData = {
                id: this.meetingData.id,
                title: this.meetingData.title,
                dialogs: this.meetingData.dialogs,
                summaries: this.meetingData.summaries,
                suggestions: this.meetingData.suggestions,
                metadata: {
                    ...this.meetingData.metadata,
                    endTime: new Date().toISOString(),
                    duration: this.calculateMeetingDuration()
                }
            };

            // Optimize dialog data to reduce size if needed
            if (formattedData.dialogs.length > 100) {
                console.log(`Optimizing large meeting data (${formattedData.dialogs.length} dialogs)`);
                // this.optimizeDialogData(formattedData);
            }

            const response = await callApi(this.meetingsApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    saveMethod,
                    meetingData: formattedData
                })
            });

            if (!response.success) {
                throw new Error(response.error || 'Failed to save meeting data');
            }

            return response;
        } catch (error) {
            console.error('Error saving meeting data:', error);
            throw new Error(error.message || 'Failed to save meeting data');
        }
    }

    // Optimize dialog data to reduce payload size
    optimizeDialogData(data) {
        // Keep only necessary fields and remove any redundant information
        if (Array.isArray(data.dialogs) && data.dialogs.length > 0) {
            data.dialogs = data.dialogs.map(dialog => {
                // Keep only essential fields and preserve time field
                return {
                    text: dialog.text,
                    speaker: dialog.speaker,
                    time: dialog.time
                };
            });
        }
        return data;
    }

    /**
     * Initialize meeting data with start time and metadata
     * @param {Object} meetingInfo - Meeting configuration information
     */
    initializeMeeting(meetingInfo) {
        this.meetingData.metadata.startTime = new Date().toISOString();
        this.meetingData.metadata.meetingInfo = meetingInfo;
    }

    startAutoSave() {
        // Auto-save every 5 minutes
        this.autoSaveInterval = setInterval(() => {
            this.saveMeetingData()
                .catch(error => console.error('Auto-save failed:', error));
        }, 5 * 60 * 1000);
    }

    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    addDialog(text) {
        this.meetingData.dialogs.push(text);
    }

    addSummary(summary) {
        if (typeof summary === 'string') {
            this.meetingData.summaries.push({
                text: summary,
                time: Date.now(),
                language: this.app?.currentLanguage || 'en'
            });
        } else {
            this.meetingData.summaries.push(summary);
        }
    }

    addSuggestion(suggestion) {
        if (typeof suggestion === 'string') {
            this.meetingData.suggestions.push({
                text: suggestion,
                time: Date.now(),
                language: this.app?.currentLanguage || 'en'
            });
        } else {
            this.meetingData.suggestions.push(suggestion);
        }
    }

    finalizeMeeting() {
        this.meetingData.metadata.endTime = new Date().toISOString();
        this.meetingData.metadata.duration = this.calculateMeetingDuration();
        this.stopAutoSave();
    }

    calculateMeetingDuration() {
        // Calculate duration in milliseconds
        const startTime = new Date(this.meetingData.metadata.startTime).getTime();
        const endTime = new Date(this.meetingData.metadata.endTime).getTime();
        
        // Return the duration in milliseconds
        return endTime - startTime;
    }

    clearMeetingData() {
        this.meetingData = {
            dialogs: [],
            summaries: [],
            suggestions: [],
            metadata: {
                startTime: null,
                endTime: null,
                duration: null,
                meetingInfo: {}
            }
        };
        this.stopAutoSave();
    }

    /**
     * Initializes a new meeting
     * @param {string} title - The title of the meeting
     */
    initMeeting(title) {
        this.meetingData = {
            id: Date.now().toString(),
            title: title || `Meeting ${new Date().toLocaleString()}`,
            transcription: '',
            dialogs: [],
            suggestions: [],
            summaries: [],
            metadata: {
                startTime: new Date().toISOString(),
                endTime: null,
                duration: null,
                participants: [],
            }
        };
    }

    /**
     * Adds a transcription to the meeting data
     * @param {string} transcription - The transcription to add
     * @param {string} source - The source of the transcription (system or mic)
     */
    addTranscription(transcription, source) {
        if (!transcription || transcription.trim() === '') return;
        
        const timestamp = new Date().toISOString();
        const formattedTranscription = `[${timestamp}] [${source}] ${transcription}\n`;
        this.meetingData.transcription += formattedTranscription;
    }

    /**
     * Saves the meeting data to the API or local storage
     * @returns {Promise<Object>} - Result of the save operation
     */
    async saveMeeting() {
        try {
            if (!this.meetingData.id) {
                throw new Error('No active meeting to save');
            }
            
            this.finalizeMeeting();
            
            if (this.apiHandler) {
                return await this.apiHandler.saveMeeting(this.meetingData);
            } else if (this.app?.dataStore) {
                return await this.app.dataStore.saveMeetingData(this.meetingData);
            } else {
                // Fallback to localStorage if no API handler or dataStore
                const meetings = JSON.parse(localStorage.getItem('meetings') || '[]');
                const existingIndex = meetings.findIndex(m => m.id === this.meetingData.id);
                
                if (existingIndex >= 0) {
                    meetings[existingIndex] = this.meetingData;
                } else {
                    meetings.push(this.meetingData);
                }
                
                localStorage.setItem('meetings', JSON.stringify(meetings));
                return { success: true, id: this.meetingData.id };
            }
        } catch (error) {
            console.error('Error saving meeting:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Fetch meetings from the remote API (Supabase) if available.
     * @returns {Promise<Array>} List of meetings or empty array on failure.
     */
    async fetchMeetings(saveMethod = 'local') {
        if (this.apiHandler && typeof this.apiHandler.getMeetings === 'function') {
            try {
                const response = await this.apiHandler.getMeetings(saveMethod);

                // L'API retourne un objet { success, data }. Nous ne voulons renvoyer que le tableau de réunions.
                if (response && response.success && Array.isArray(response.data)) {
                    return response.data;
                }

                // Si la structure n'est pas celle attendue, retourner telle quelle afin que l'appelant puisse gérer.
                return response;
            } catch (error) {
                console.error('Error fetching meetings from API:', error);
                return [];
            }
        }
        return [];
    }
} 