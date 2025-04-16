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
                startSessionButton: "Démarrer une session",
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
                startSessionButton: "Start Session",
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
            startSessionButton: this.sessionControlButton, // Renommé pour clarté
            saveMeetingInfosButton: this.saveMeetingInfosButton,
            closeMeetingInfosButton: this.closeMeetingInfosButton,
        };

        this.selectedTranslations = this.translations[lang];
            
        Object.keys(uiElements).forEach((key) => {
            if (uiElements[key]) {
                uiElements[key].textContent = this.selectedTranslations[key];
            }
        });
        
        this.systemCaptureButton.textContent = this.isRecording ? this.selectedTranslations.systemButtonStop : this.selectedTranslations.systemButtonStart;
        this.micCaptureButton.textContent = this.isRecording ? this.selectedTranslations.micButtonStop : this.selectedTranslations.micButtonStart;
        this.updateTranscription(this.selectedTranslations.transcriptionPlaceholder);
        this.updateSuggestions(this.selectedTranslations.suggestionsPlaceholder);
        this.meetingsInfosLabels = this.selectedTranslations.meetingsInfosLabels;
    }
  
    /**
     * Initializes the UI by populating language options and setting event listeners.
     * @param {Function} onLangChange - Callback for language change.
     */
    initialize(onLangChange) {
        this.populateLangOptions();
        this.langSelect.addEventListener("change", () => {
            const selectedLang = this.langSelect.value;
            onLangChange(selectedLang);
        });
        this.translateUI(this.defaultLang);
        
        // Renommer le bouton pour "Démarrer une session"
        if (this.sessionControlButton) {
            this.sessionControlButton.innerHTML = `
                <span class="button-icon">🚀</span>
                ${this.selectedTranslations.startSessionButton}
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
        this.transcriptionDiv.innerText = transcription;
    }
  
    /**
     * Updates the suggestions section of the UI.
     * @param {string} suggestions - The suggestions text to display.
     */
    updateSuggestions(suggestions) {
        this.suggestionsDiv.innerText = suggestions || "No suggestions generated.";
    }
  
    /**
     * Toggles the state of the capture buttons (system or mic).
     * @param {string} type - The type of capture ("system" or "mic").
     * @param {boolean} isRecording - Whether recording is active.
     */
    toggleCaptureButton(type, isRecording) {
        this.isRecording = isRecording;
        switch (type) {
        case SYSTEM_SOURCE:
            this.systemCaptureButton.textContent = this.isRecording ? this.selectedTranslations.systemButtonStop : this.selectedTranslations.systemButtonStart;
            break;
        default:
            this.micCaptureButton.textContent = this.isRecording ? this.selectedTranslations.micButtonStop : this.selectedTranslations.micButtonStart;
            break;
        }
    }

    populateVideoElement(stream) {
        this.videoElement.srcObject = stream;
        this.videoElement.onloadedmetadata = () => {
            this.videoElement.play();
        };
    }

    closeVideoElement() {
        this.videoElement.pause();
        this.videoElement.srcObject = null;
    }

    populateMeetingModal() {
        // Mise à jour du titre de la modale
        const modalTitle = document.querySelector('.meeting-modal h2');
        if (modalTitle) {
            modalTitle.textContent = this.selectedTranslations.modalTitle;
        }
        
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
}
  