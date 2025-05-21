/**
 * Handles interactions with the user interface, including updating the DOM
 * and managing button event listeners.
 */

const SYSTEM_SOURCE = 'system';
export class UIHandler {

    constructor() {
        this.isRecording = false;
        this.systemCaptureButton = document.getElementById("systemCaptureButton");
        this.micCaptureButton = document.getElementById("micCaptureButton");
        this.suggestionButton = document.getElementById("suggestionButton");
        this.transcriptionDiv = document.getElementById("transcription");
        this.suggestionsDiv = document.getElementById("suggestions");
        
        this.sessionControlButton = document.getElementById("sessionControlButton");
        this.meetingModal = document.getElementById("meetingModal");
        this.modalOverlay = document.getElementById("modalOverlay");
        this.dynamicFields = document.getElementById("dynamicFields");
        this.saveMeetingInfosButton = document.getElementById("saveMeetingInfosButton");
        this.closeMeetingInfosButton = document.getElementById("closeMeetingInfosButton");
        
        // Mode d'utilisation (libre ou assisté)
        this.mode = 'libre'; // Par défaut : mode libre
        
        this.meetingsInfosLabels = [
            "Titre du poste", 
            "Missions", 
            "Informations sur l'entreprise",
            "Informations sur le candidat (utilisateur)", 
            "Informations complémentaires"
        ];

        this.langSelect = document.getElementById("langSelect");
        this.defaultLang = "fr";
        
        this.supportedLangs = [
            { code: "fr", label: "Français" },
            { code: "en", label: "English" },
        ];

        this.translations = {
            fr: {
                systemButtonStart: "Démarrer la capture système",
                systemButtonStop: "Arrêter la capture système",
                micButtonStart: "Démarrer la capture micro",
                micButtonStop: "Arrêter la capture micro",
                suggestionButton: "Générer des suggestions",
                sessionControlButton: "Démarrer une session",
                sessionButtonStop: "Arrêter la session",
                saveMeetingInfosButton: "Enregistrer les infos",
                closeMeetingInfosButton: "Fermer",
                transcriptionPlaceholder: "La transcription apparaîtra ici...",
                suggestionsPlaceholder: "Les suggestions apparaîtront ici.",
                modalTitle: "Configuration de la session",
                sessionTabTitle: "Session",
                meetingTabTitle: "Réunion",
                modeLibre: "Mode Libre",
                modeAssiste: "Mode Assisté",
                modeLibreDesc: "Transcription simple sans ajout d'informations contextuel",
                modeAssisteDesc: "Transcription avec ajout d'informations pour un meilleur contexte",
                startSession: "Démarrer la session",
                meetingsInfosLabels : [
                    "Titre du poste", 
                    "Missions", 
                    "Informations sur l'entreprise",
                    "Informations sur le candidat (utilisateur)", 
                    "Informations complémentaires"
                ]
            },
            en: {
                systemButtonStart: "Start System Capture",
                systemButtonStop: "Stop System Capture",
                micButtonStart: "Start Mic Capture",
                micButtonStop: "Stop Mic Capture",
                suggestionButton: "Generate Suggestions",
                sessionControlButton: "Start a session",
                sessionButtonStop: "Stop Session",
                saveMeetingInfosButton: "Save Meeting Info",
                closeMeetingInfosButton: "Close",
                transcriptionPlaceholder: "Transcription will appear here...",
                suggestionsPlaceholder: "Suggestions will appear here.",
                modalTitle: "Session Configuration",
                sessionTabTitle: "Session",
                meetingTabTitle: "Meeting",
                modeLibre: "Free Mode",
                modeAssiste: "Assisted Mode",
                modeLibreDesc: "Simple transcription without additional context information",
                modeAssisteDesc: "Transcription with additional context information for better understanding",
                startSession: "Start Session",
                meetingsInfosLabels : [
                    "Job Title", 
                    "Missions", 
                    "Company Information",
                    "Candidate Information (User)", 
                    "Additional Information"
                ]
            },
        };

        this.selectedTranslations = this.translations[this.defaultLang];
        this.videoElement = document.getElementById("screen-capture");
    }

    translateUI(lang) {
        const uiElements = {
            suggestionButton: this.suggestionButton,
            sessionControlButton: this.sessionControlButton,
            saveMeetingInfosButton: this.saveMeetingInfosButton,
            closeMeetingInfosButton: this.closeMeetingInfosButton,
        };

        this.selectedTranslations = this.translations[lang];
            
        Object.keys(uiElements).forEach((key) => {
            if (uiElements[key]) {
                uiElements[key].textContent = this.selectedTranslations[key];
            }
        });
        
        // Only update button text if the elements exist
        if (this.systemCaptureButton) {
            this.systemCaptureButton.textContent = this.isRecording ? this.selectedTranslations.systemButtonStop : this.selectedTranslations.systemButtonStart;
        }
        if (this.micCaptureButton) {
            this.micCaptureButton.textContent = this.isRecording ? this.selectedTranslations.micButtonStop : this.selectedTranslations.micButtonStart;
        }
        if (this.transcriptionDiv) {
            this.updateTranscription(this.selectedTranslations.transcriptionPlaceholder);
        }
        if (this.suggestionsDiv) {
            this.updateSuggestions(this.selectedTranslations.suggestionsPlaceholder);
        }
        this.meetingsInfosLabels = this.selectedTranslations.meetingsInfosLabels;
    }
  
    /**
     * Initializes the UI by populating language options and setting event listeners.
     * @param {Function} onLangChange - Callback for language change.
     */
    initialize(onLangChange) {
        // Populate language dropdown only if element exists
        if (this.langSelect) {
            this.populateLangOptions();
            this.langSelect.addEventListener("change", () => {
                const selectedLang = this.langSelect.value;
                onLangChange(selectedLang);
            });
        }
        this.translateUI(this.defaultLang);
        
        // S'assurer que la fenêtre modale est cachée par défaut
        if (this.meetingModal) {
            this.meetingModal.style.display = "none";
        }
        if (this.modalOverlay) {
            this.modalOverlay.style.display = "none";
        }
        
        // Renommer le bouton pour "Démarrer une session"
        if (this.sessionControlButton) {
            this.sessionControlButton.innerHTML = `
                <span class="button-icon">🚀</span>
                ${this.selectedTranslations.sessionControlButton}
            `;
        }
        
        // Empêcher le défilement automatique de la transcription
        if (this.transcriptionDiv) {
            this.transcriptionDiv.classList.add('no-auto-scroll');
        }
    }
  
    /**
     * Populates the language selection dropdown.
     */
    populateLangOptions() {
        if (!this.langSelect) return;
        this.supportedLangs.forEach((lang) => {
            const option = document.createElement("option");
            option.value = lang.code;
            option.textContent = lang.label;
            this.langSelect.appendChild(option);
        });
        this.langSelect.value = this.defaultLang;
    }
  
    /**
     * Updates the transcription section of the UI.
     * @param {string} transcription - The transcription text to display.
     */
    updateTranscription(transcription) {
        // Ensure transcriptionDiv reference is current
        if (!this.transcriptionDiv) {
            this.transcriptionDiv = document.getElementById("transcription");
        }
        if (!this.transcriptionDiv) {
            console.warn("UIHandler: Transcription element '#transcription' not found");
            return;
        }
        this.transcriptionDiv.innerText = transcription;
    }
  
    /**
     * Updates the suggestions section of the UI.
     * @param {string} suggestions - The suggestions text to display.
     */
    updateSuggestions(suggestions) {
        // Ensure suggestionsDiv reference is current
        if (!this.suggestionsDiv) {
            this.suggestionsDiv = document.getElementById("suggestions");
        }
        if (!this.suggestionsDiv) {
            console.warn("UIHandler: Suggestions element '#suggestions' not found");
            return;
        }
        this.suggestionsDiv.innerText = suggestions || "No suggestions generated.";
    }
  
    /**
     * Toggles the state of the capture buttons (system or mic).
     * @param {string} type - The type of capture ("system" or "mic").
     * @param {boolean} isRecording - Whether recording is active.
     */
    toggleCaptureButton(type, isRecording) {
        this.isRecording = isRecording;
        const updateLabel = (button, startText, stopText) => {
            if (!button) return;
            const labelSpan = button.querySelector('.meeting-label');
            if (labelSpan) {
                labelSpan.textContent = this.isRecording ? stopText : startText;
            } else {
                // Fallback: update full button text
                button.textContent = this.isRecording ? stopText : startText;
            }
        };
        switch (type) {
        case SYSTEM_SOURCE:
            updateLabel(this.systemCaptureButton, this.selectedTranslations.systemButtonStart, this.selectedTranslations.systemButtonStop);
            break;
        default:
            updateLabel(this.micCaptureButton, this.selectedTranslations.micButtonStart, this.selectedTranslations.micButtonStop);
            break;
        }
    }

    populateVideoElement(stream) {
        // Ensure videoElement reference is current
        if (!this.videoElement) {
            this.videoElement = document.getElementById("screen-capture");
        }
        if (!this.videoElement) {
            console.warn("UIHandler: Video element '#screen-capture' not found");
            return;
        }
        this.videoElement.srcObject = stream;
        this.videoElement.onloadedmetadata = () => {
            this.videoElement.play();
        };
    }

    closeVideoElement() {
        // Ensure videoElement reference is current
        if (!this.videoElement) {
            this.videoElement = document.getElementById("screen-capture");
        }
        if (!this.videoElement) {
            console.warn("UIHandler: Video element '#screen-capture' not found");
            return;
        }
        this.videoElement.pause();
        this.videoElement.srcObject = null;
    }

    populateMeetingModal() {
        // Mise à jour du titre de la modale
        const modalTitle = document.querySelector('.meeting-modal h2');
        if (modalTitle) {
            modalTitle.textContent = this.selectedTranslations.modalTitle;
        }
        
        // Ensure references exist
        if (!this.meetingModal) this.meetingModal = document.getElementById("meetingModal");
        if (!this.modalOverlay) this.modalOverlay = document.getElementById("modalOverlay");
        if (!this.dynamicFields) this.dynamicFields = document.getElementById("dynamicFields");

        if (!this.dynamicFields) return; // safety

        // Création du contenu de la modale avec onglets
        this.dynamicFields.innerHTML = `
            <div class="modal-tabs">
                <div class="modal-tab active" data-tab-modal="session">${this.selectedTranslations.sessionTabTitle}</div>
                <div class="modal-tab" data-tab-modal="meeting">${this.selectedTranslations.meetingTabTitle}</div>
            </div>
            
            <div id="session-tab" class="tab-content-modal active">
                <div class="session-modes">
                    <div class="session-mode ${this.mode === 'libre' ? 'selected' : ''}" data-mode="libre">
                        <h3>${this.selectedTranslations.modeLibre}</h3>
                        <p>${this.selectedTranslations.modeLibreDesc}</p>
                    </div>
                    <div class="session-mode ${this.mode === 'assiste' ? 'selected' : ''}" data-mode="assiste">
                        <h3>${this.selectedTranslations.modeAssiste}</h3>
                        <p>${this.selectedTranslations.modeAssisteDesc}</p>
                    </div>
                </div>
                <button id="startSessionButton" class="button mode-start-session">${this.selectedTranslations.startSession}</button>
            </div>
            
            <div id="meeting-tab" class="tab-content-modal">
                <div class="meeting-info-fields">
                    ${this.meetingsInfosLabels.map(key => `
                        <div class="field-group">
                            <label for="input-${key}">${key}</label>
                            <input type="text" id="input-${key}" placeholder="${key}">
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Masquer le bouton de sauvegarde par défaut
        if (this.saveMeetingInfosButton) {
            this.saveMeetingInfosButton.style.display = 'none';
        }
        
        // Configuration des écouteurs d'événements de la modale
        this.setupModalEventListeners();
        
        // Afficher la modale
        this.meetingModal.style.display = "block";
        this.modalOverlay.style.display = "block";
    }

    setupModalEventListeners() {
        // Gestionnaires d'événements pour les onglets
        const tabs = this.dynamicFields.querySelectorAll('.modal-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const tabId = tab.getAttribute('data-tab-modal');
                this.dynamicFields.querySelectorAll('.tab-content-modal').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(`${tabId}-tab`).classList.add('active');

                // Afficher/masquer le bouton de sauvegarde selon l'onglet actif
                if (this.saveMeetingInfosButton) {
                    this.saveMeetingInfosButton.style.display = tabId === 'meeting' ? 'block' : 'none';
                }
            });
        });
        
        // Gestionnaires d'événements pour les modes de session
        const sessionModes = this.dynamicFields.querySelectorAll('.session-mode');
        sessionModes.forEach(mode => {
            mode.addEventListener('click', () => {
                sessionModes.forEach(m => m.classList.remove('selected'));
                mode.classList.add('selected');
                this.mode = mode.getAttribute('data-mode');
            });
        });
    }

    closeMeetingModal() {
        this.meetingModal.style.display = "none";
        this.modalOverlay.style.display = "none";
    }
    
    initializeKeydownEventListeners() {        
        document.addEventListener("keydown", (event) => {
            if (event.code === "Space" && this.meetingModal.style.display === "none") {
                event.preventDefault();
                this.suggestionButton.click();
            }
        });
    }

    /**
     * Obtient le mode d'utilisation actuel.
     * @returns {string} - Mode d'utilisation ('libre' ou 'assiste').
     */
    getMode() {
        return this.mode;
    }

    refreshMeetingElements() {
        this.videoElement = document.getElementById("screen-capture");
        this.suggestionsDiv = document.getElementById("suggestions");
        this.transcriptionDiv = document.getElementById("transcription");
        // Refresh buttons that are only available on the meeting page
        this.systemCaptureButton = document.getElementById("systemCaptureButton");
        this.micCaptureButton = document.getElementById("micCaptureButton");
        this.suggestionButton = document.getElementById("suggestionButton");
        // Refresh other UI elements
        this.langSelect = document.getElementById("langSelect");
    }
    
    /**
     * Sets up the language switcher in the UI.
     * This is a wrapper around populateLangOptions to ensure language switcher is properly initialized.
     */
    setupLanguageSwitcher() {
        // Make sure we have the latest reference to the language select element
        this.langSelect = document.getElementById("langSelect");
        
        if (this.langSelect) {
            // Clear existing options to avoid duplicates
            this.langSelect.innerHTML = '';
            
            // Populate language options
            this.populateLangOptions();
            
            console.log("Language switcher set up successfully");
        } else {
            console.warn("Language select element not found in the DOM");
        }
    }
    
    /**
     * Returns the currently selected translations object.
     * @returns {Object} - The current translations object.
     */
    getTranslations() {
        return this.selectedTranslations || this.translations[this.defaultLang];
    }
}
  