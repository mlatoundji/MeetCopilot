import { callApi } from '../utils.js';

export class BackupHandler {
    constructor(meetingsApiUrl) {
        this.meetingsApiUrl = meetingsApiUrl;
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

            // Ensure data is properly formatted
            const formattedData = {
                dialogs: this.meetingData.dialogs,
                summaries: this.meetingData.summaries,
                suggestions: this.meetingData.suggestions,
                metadata: {
                    ...this.meetingData.metadata,
                    endTime: new Date().toISOString(),
                    duration: this.calculateMeetingDuration()
                }
            };

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
        this.meetingData.duration = this.calculateMeetingDuration();
        this.stopAutoSave();
    }

    calculateMeetingDuration() {
        // Implementation depends on how you track meeting duration
        const duration = this.meetingData.metadata.endTime - this.meetingData.metadata.startTime;
        return duration;
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