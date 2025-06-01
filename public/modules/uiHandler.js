/**
 * Handles interactions with the user interface, including updating the DOM
 * and managing button event listeners.
 */

const SYSTEM_SOURCE = 'system';
import { I18nLoader } from './i18nLoader.js';

export class UIHandler {

    constructor(app) {
        this.app = app;
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

        this.langSelect = document.getElementById("langSelect");
        this.defaultLang = "fr";
        
        this.supportedLangs = [
            { code: "fr", label: "Français" },
            { code: "en", label: "English" },
        ];

        // Initialize internationalization loader
        this.i18n = new I18nLoader();
        this.currentTranslations = {};
        this.videoElement = document.getElementById("screen-capture");
    }

    async translateUI(lang) {
        const translations = await this.i18n.load(lang);
        this.currentTranslations = translations;
        const uiElements = {
            suggestionButton: this.suggestionButton,
            sessionControlButton: this.sessionControlButton,
            saveMeetingInfosButton: this.saveMeetingInfosButton,
            closeMeetingInfosButton: this.closeMeetingInfosButton,
        };
        Object.keys(uiElements).forEach((key) => {
            const el = uiElements[key];
            if (el) el.textContent = translations[key] || key;
        });
        
        if (this.systemCaptureButton) {
            this.systemCaptureButton.textContent = this.isRecording ? (translations.systemButtonStop || '') : (translations.systemButtonStart || '');
        }
        if (this.micCaptureButton) {
            this.micCaptureButton.textContent = this.isRecording ? (translations.micButtonStop || '') : (translations.micButtonStart || '');
        }
        if (this.transcriptionDiv) {
            this.updateTranscription(translations.transcriptionPlaceholder || '');
        }
        if (this.suggestionsDiv) {
            this.updateSuggestions(translations.suggestionsPlaceholder || '');
        }
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
        // Initial load of UI translations
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
            const label = this.currentTranslations.sessionControlButton || '';
            this.sessionControlButton.innerHTML = `
                <span class="button-icon">🚀</span>
                ${label}
            `;
        }
        
        // Empêcher le défilement automatique de la transcription
        if (this.transcriptionDiv) {
            this.transcriptionDiv.classList.add('no-auto-scroll');
        }

        // Close modal when clicking the Close button
        if (this.closeMeetingInfosButton) {
            this.closeMeetingInfosButton.addEventListener('click', () => this.closeMeetingModal());
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
        this.transcriptionDiv.innerText = transcription || "No transcription available.";
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
        const t = this.currentTranslations || {};
        switch (type) {
          case SYSTEM_SOURCE:
            updateLabel(this.systemCaptureButton, t.systemButtonStart || '', t.systemButtonStop || '');
            break;
          default:
            updateLabel(this.micCaptureButton, t.micButtonStart || '', t.micButtonStop || '');
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

    async populateMeetingModal() {
        const translations = await this.i18n.load(this.app.currentLanguage || this.defaultLang);
        // Update modal title
        const modalTitle = document.querySelector('.meeting-modal h2');
        if (modalTitle) {
            modalTitle.textContent = translations.modalTitle || modalTitle.textContent;
        }
        
        // Ensure references exist
        if (!this.meetingModal) this.meetingModal = document.getElementById("meetingModal");
        if (!this.modalOverlay) this.modalOverlay = document.getElementById("modalOverlay");
        if (!this.dynamicFields) this.dynamicFields = document.getElementById("dynamicFields");

        if (!this.dynamicFields) return; // safety

        // Dynamically load localized meetingFieldsConfig
        const lang = this.app.currentLanguage || this.defaultLang;
        let meetingFieldsConfig;
        try {
          const module = await import(`../resources/meetingFieldsConfig.${lang}.js`);
          meetingFieldsConfig = module.meetingFieldsConfig;
        } catch {
          // Fallback to French default
          const module = await import(`../resources/meetingFieldsConfig.fr.js`);
          meetingFieldsConfig = module.meetingFieldsConfig;
        }

        // Build multi-step wizard
        this.dynamicFields.innerHTML = `
            <div class="modal-tabs">
                ${meetingFieldsConfig.map((cat, idx) => `<div class="modal-tab${idx === 0 ? ' active' : ''}" data-tab-modal="${cat.id}">${cat.title}</div>`).join('')}
                <div class="modal-tab" data-tab-modal="session">${await this.i18n.get('sessionTabTitle', lang)}</div>
            </div>

            ${meetingFieldsConfig.map((cat, idx) => `
                <div id="${cat.id}-tab" class="tab-content-modal${idx === 0 ? ' active' : ''}">
                    <div class="meeting-info-fields">
                        ${cat.fields.map(field => `
                            <div class="field-group">
                                <label for="input-${field.key}">${field.label}</label>
                                ${field.type === 'textarea'
                                    ? `<textarea id="input-${field.key}" placeholder="${field.label}"></textarea>`
                                    : `<input type="text" id="input-${field.key}" placeholder="${field.label}" />`
                                }
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}

            <div id="session-tab" class="tab-content-modal">
                <div class="session-modes">
                    <div class="session-mode ${this.mode === 'libre' ? 'selected' : ''}" data-mode="libre">
                        <h3>${translations.modeLibre || ''}</h3>
                        <p>${translations.modeLibreDesc || ''}</p>
                    </div>
                    <div class="session-mode ${this.mode === 'assiste' ? 'selected' : ''}" data-mode="assiste">
                        <h3>${translations.modeAssiste || ''}</h3>
                        <p>${translations.modeAssisteDesc || ''}</p>
                    </div>
                </div>
            </div>


            <div class="modal-nav">
                <button id="prevStepButton" class="button-secondary">${translations.prevStepButton || 'Précédent'}</button>
                <button id="nextStepButton" class="button-primary">${translations.nextStepButton || 'Suivant'}</button>
                <button id="startSessionButton" class="button mode-start-session">${translations.startSession || ''}</button>
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
        // Prevent body scrolling when modal is open
        document.body.classList.add('modal-open');

        // Store config for event listeners
        this.meetingFieldsConfig = meetingFieldsConfig;
    }

    setupModalEventListeners() {
        const tabs = Array.from(this.dynamicFields.querySelectorAll('.modal-tab'));
        const contents = Array.from(this.dynamicFields.querySelectorAll('.tab-content-modal'));
        const prevBtn = this.dynamicFields.querySelector('#prevStepButton');
        const nextBtn = this.dynamicFields.querySelector('#nextStepButton');

        const updateNavButtons = () => {
            const activeIdx = tabs.findIndex(t => t.classList.contains('active'));
            if (prevBtn) prevBtn.style.display = activeIdx <= 0 ? 'none' : 'inline-block';
            if (nextBtn) nextBtn.style.display = activeIdx >= tabs.length - 1 ? 'none' : 'inline-block';
        };

        tabs.forEach((tab, idx) => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                contents.forEach(c => c.classList.remove('active'));
                const id = tab.getAttribute('data-tab-modal');
                const pane = document.getElementById(`${id}-tab`);
                if (pane) pane.classList.add('active');
                updateNavButtons();
            });
        });

        if (prevBtn) prevBtn.addEventListener('click', () => {
            const active = tabs.find(t => t.classList.contains('active'));
            const idx = tabs.indexOf(active);
            if (idx > 0) tabs[idx - 1].click();
        });
        if (nextBtn) nextBtn.addEventListener('click', () => {
            const active = tabs.find(t => t.classList.contains('active'));
            const idx = tabs.indexOf(active);
            if (idx < tabs.length - 1) tabs[idx + 1].click();
        });

        updateNavButtons();

        // Gestionnaires d'événements pour les modes de session
        const sessionModes = this.dynamicFields.querySelectorAll('.session-mode');
        sessionModes.forEach(mode => {
            mode.addEventListener('click', () => {
                sessionModes.forEach(m => m.classList.remove('selected'));
                mode.classList.add('selected');
                this.mode = mode.getAttribute('data-mode');
            });
        });

        // Start session API call
        const startBtn = this.dynamicFields.querySelector('#startSessionButton');
        if (startBtn) {
            startBtn.addEventListener('click', async () => {
                // Gather metadata from all fields
                const metadata = {};
                (this.meetingFieldsConfig || []).forEach(cat => {
                    cat.fields.forEach(field => {
                        const input = document.getElementById(`input-${field.key}`);
                        metadata[field.key] = input ? input.value : '';
                    });
                });
                const mode = this.getMode();
                try {
                    // Use SessionHandler to create session and set conversationId
                    const resp = await this.app.sessionHandler.createSession(mode, metadata);
                    const sessionId = resp.session_id;
                    const conversationId = resp.conversation_id;
                    localStorage.setItem('currentSessionId', sessionId);
                    localStorage.setItem('currentConversationId', conversationId);
                    this.closeMeetingModal();
                    window.location.hash = 'meeting';
                } catch (err) {
                    console.error('Error creating session:', err);
                    alert(this.currentTranslations[12] || 'Erreur lors de la création de la session.');
                }
            });
        }
    }

    closeMeetingModal() {
        this.meetingModal.style.display = "none";
        this.modalOverlay.style.display = "none";
        // Restore body scrolling when modal is closed
        document.body.classList.remove('modal-open');
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
        return this.currentTranslations || {};
    }

    // Add new method to render transcription messages as styled cards
    renderTranscription(messages, startTime, useRelativeTime) {
        if (!this.transcriptionDiv) {
            this.transcriptionDiv = document.getElementById("transcription");
        }
        if (!this.transcriptionDiv) return;
        // Clear existing content
        this.transcriptionDiv.innerHTML = "";
        if (!Array.isArray(messages) || messages.length === 0) {
            this.transcriptionDiv.innerText = "No transcription available.";
            return;
        }
        // Ensure container styling
        this.transcriptionDiv.classList.add("transcription-cards-container");
        // Render each message as a card
        messages.forEach(msg => {
            const card = document.createElement("div");
            card.className = "transcription-card";
            // Speaker name
            const speakerEl = document.createElement("div");
            speakerEl.className = "speaker-name";
            speakerEl.innerText = msg.speaker;
            card.appendChild(speakerEl);
            // Timestamp
            const timeEl = document.createElement("div");
            timeEl.className = "message-timestamp";
            let timeText = "";
            if (useRelativeTime) {
                const diff = msg.time - startTime;
                const hrs = String(Math.floor(diff / 3600000)).padStart(2, "0");
                const mins = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
                const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
                timeText = `+${hrs}:${mins}:${secs}`;
            } else {
                timeText = new Date(msg.time).toLocaleTimeString();
            }
            timeEl.innerText = timeText;
            card.appendChild(timeEl);
            // Message text
            const textEl = document.createElement("div");
            textEl.className = "message-text";
            textEl.innerText = msg.text;
            card.appendChild(textEl);
            // Append card
            this.transcriptionDiv.appendChild(card);
        });
    }
}
  