import { callApi } from '../utils.js';

export class BackupHandler {
    constructor(meetingsApiUrl, app) {
        this.app = app;
        this.meetingsApiUrl = meetingsApiUrl;
        this.meetingData = {
            id: null,
            title: null,
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

            this.meetingData.id = this.meetingData.id || Date.now();
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
        if (data.dialogs && data.dialogs.length > 0) {
            data.dialogs = data.dialogs.map(dialog => {
                // Keep only essential fields
                return {
                    text: dialog.text, 
                    speaker: dialog.speaker,
                    timestamp: dialog.timestamp
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

    addSummary(text) {
        this.meetingData.summaries.push(text);
    }

    addSuggestion(suggestion) {
        this.meetingData.suggestions.push(suggestion);
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
} 