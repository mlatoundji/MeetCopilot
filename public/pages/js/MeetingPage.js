import { APIHandler } from '../../modules/apiHandler.js';
import { UIHandler } from '../../modules/uiHandler.js';
import { TranscriptionHandler } from '../../modules/transcriptionHandler.js';
import { SuggestionsHandler } from '../../modules/suggestionsHandler.js';
import { DataStore } from '../../modules/dataStore.js';
import { AudioCaptureWorklet } from '../../modules/audioCaptureAudioWorklet.js';
import { AudioCapture } from '../../modules/audioCapture.js';
import { LayoutManager } from '../../modules/layoutManager.js';
import { ConversationContextHandler } from '../../modules/conversationContextHandler.js';
import { filterTranscription } from '../../utils.js';
import { shortcuts } from '../../modules/shortcuts.js';
import { meetingFieldsConfig } from '../../resources/meetingFieldsConfig.js';

export class MeetingPage {
  constructor(app) {
    this.app = app;
    this.apiHandler = app?.apiHandler || new APIHandler();
    this.dataStore = app?.dataStore || new DataStore(this.apiHandler);
    this.uiHandler = app?.uiHandler || new UIHandler();
    this.transcriptionHandler = app?.transcriptionHandler || new TranscriptionHandler(this.apiHandler);
    this.suggestionsHandler = app?.suggestionsHandler || new SuggestionsHandler(this.apiHandler);
    const useAudioWorklet = app?.useAudioWorklet ?? false;
    this.audioCapture = app?.audioCapture || (useAudioWorklet ? new AudioCaptureWorklet() : new AudioCapture());
    this.layoutManager = new LayoutManager();
    this.conversationContextHandler = app?.conversationContextHandler || new ConversationContextHandler();
    this.conversationContextHandler.startTime = Date.now();

    // Constantes pour les sources audio
    this.SYSTEM_SOURCE = this.conversationContextHandler.SYSTEM_SOURCE || 'system';
    this.MIC_SOURCE = this.conversationContextHandler.MIC_SOURCE || 'mic';
    // Labels pour context
    this.systemLabel = this.conversationContextHandler.systemLabel || 'Guest';
    this.micLabel = this.conversationContextHandler.micLabel || 'User';

    this.isRecording = false;
    this.systemCapture = null;
    this.micCapture = null;
    this.selectedTranslations = this.uiHandler.getTranslations();

    // Silence-mode auto-flush timeout: duration in ms (0 to disable)
    this.silenceTimeoutDuration = this.app?.silenceTimeoutDuration ?? 20000;
    this.enableSilenceTimeout = this.silenceTimeoutDuration > 0;
    this.systemSilenceTimeoutId = null;
    this.micSilenceTimeoutId = null;
    // Guards to prevent overlapping silence-mode transcriptions
    this.silenceTranscribing = {
      [this.SYSTEM_SOURCE]: false,
      [this.MIC_SOURCE]: false
    };
    this.maxSamplesDurationSec = (this.silenceTimeoutDuration / 1000) || 30;
  }

  async loadFragment() {
    const response = await fetch('pages/html/meeting.html');
    const html = await response.text();
    const main = document.querySelector('.main-content');
    if (main) {
      main.innerHTML = html;
    }
  }

  initializeElements() {
    this.systemCaptureButton = document.getElementById('systemCaptureButton');
    this.micCaptureButton = document.getElementById('micCaptureButton');
    this.suggestionButton = document.getElementById('suggestionButton');
    this.transcriptionBox = document.querySelector('.transcription-box');
    this.screenCaptureSection = document.getElementById('screen-capture-section');
    this.suggestionsContainer = document.querySelector('.suggestions-container');
    this.transcriptionSection = document.getElementById('transcriptionArea');
    this.container = document.querySelector('.container');
    this.quitButton = document.getElementById('quitButton');
    this.finishButton = document.getElementById('finishButton');
    this.finishNoSaveButton = document.getElementById('finishNoSaveButton');
    this.meetingContentGrid = document.getElementById('meetingContentGrid');
    this.meetingSidebar = document.getElementById('meetingSidebar');
    this.captureButton = document.getElementById('captureButton');

    // Masquer la sidebar principale dans la page meeting
    const mainSidebar = document.querySelector('.sidebar');
    if (mainSidebar) mainSidebar.style.display = 'none';
  }

  bindEvents() {
    if (this.systemCaptureButton) {
      this.systemCaptureButton.addEventListener('click', () => this.toggleSystemCapture());
    }
    if (this.micCaptureButton) {
      this.micCaptureButton.addEventListener('click', () => this.toggleMicCapture());
    }
    if (this.suggestionButton) {
      this.suggestionButton.addEventListener('click', () => this.startSuggestionsStreaming());
    }
    if (this.quitButton) {
      this.quitButton.addEventListener('click', () => this.quitMeeting());
    }
    if (this.finishButton) {
      this.finishButton.addEventListener('click', () => this.finishMeeting());
    }
    if (this.finishNoSaveButton) {
      this.finishNoSaveButton.addEventListener('click', () => this.finishNoSaveMeeting());
    }
    
    // Eléments d'agencement flexible
    const toggleSidebar = document.getElementById('toggleSidebar');
    if (toggleSidebar) {
      toggleSidebar.addEventListener('click', () => this.toggleSidebar());
    }
    
    const toggleLayoutPresets = document.getElementById('toggleLayoutPresets');
    if (toggleLayoutPresets) {
      toggleLayoutPresets.addEventListener('click', () => this.layoutManager.toggleLayoutPresetsPanel());
    }
    
    // Boutons de préréglage d'agencement
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.applyLayoutPreset(button.dataset.preset);
      });
    });

    const toggleFullSidebarBtn = document.getElementById('toggleSidebarFull');
    if (toggleFullSidebarBtn) {
      toggleFullSidebarBtn.addEventListener('click', () => this.toggleFullSidebar());
    }

    if (this.captureButton) {
      this.captureButton.addEventListener('click', () => this.captureImage());
    }
  }

  async finishMeeting() {
    const sessionId = localStorage.getItem('currentSessionId');
    const conversationId = this.conversationContextHandler.conversationId;
    if (!sessionId || !conversationId){
      console.error('No session or conversation id found');
      return;
    }
    try {
      await this.apiHandler.callApi(
        `${this.apiHandler.baseURL}${this.apiHandler.apiPrefix}/sessions/${sessionId}`,
        { method: 'PATCH', body: JSON.stringify({ status: 'completed' }) }
      );
      // Generate detailed summary for this session
      try {
        const summaryResp = await this.apiHandler.callApi(
          `${this.apiHandler.baseURL}${this.apiHandler.apiPrefix}/summary/detailed`,
          {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId, conversation_id: conversationId })
          }
        );
        console.log('Detailed summary generated:', summaryResp.summary);
      } catch (summaryErr) {
        console.error('Error generating detailed summary:', summaryErr);
      }
    } catch (err) {
      console.error('Error finishing session:', err);
    }
    localStorage.removeItem('currentSessionId');
    localStorage.removeItem('currentConversationId');
    window.location.hash = 'home';
  }

  async finishNoSaveMeeting() {
    const sessionId = localStorage.getItem('currentSessionId');
    if (!sessionId) return;
    try {
      await this.apiHandler.callApi(
        `${this.apiHandler.baseURL}${this.apiHandler.apiPrefix}/sessions/${sessionId}`,
        { method: 'DELETE' }
      );
    } catch (err) {
      console.error('Error deleting session:', err);
    }
    localStorage.removeItem('currentSessionId');
    localStorage.removeItem('currentConversationId');
    window.location.hash = 'home';
  }

  quitMeeting() {
    console.log("Quitting meeting");

    this.conversationContextHandler.resetConversationContext();
    // Arrêter les enregistrements audio
    if (this.audioCapture.isSystemRecording) {
      this.toggleSystemCapture();
    }
    if (this.audioCapture.isMicRecording) {
      this.toggleMicCapture();
    }
    
    // Revenir à la page d'accueil
    window.location.hash = 'home';
  }

  updateButtonStates() {
    if (this.systemCaptureButton) {
      const label = this.systemCaptureButton.querySelector('.meeting-label');
      if (label) {
        label.textContent = this.audioCapture.isSystemRecording ? 
          this.uiHandler.selectedTranslations.systemButtonStop : 
          this.uiHandler.selectedTranslations.systemButtonStart;
      }
    }
    if (this.micCaptureButton) {
      const label = this.micCaptureButton.querySelector('.meeting-label');
      if (label) {
        label.textContent = this.audioCapture.isMicRecording ? 
          this.uiHandler.selectedTranslations.micButtonStop : 
          this.uiHandler.selectedTranslations.micButtonStart;
      }
    }
  }

  async render() {
    await this.loadFragment();
    this.initializeElements();

    // Hide global header and main sidebar on meeting page
    const header = document.querySelector('.header-horizontal');
    if (header) header.style.display = 'none';
    const mainSidebar = document.querySelector('.sidebar');
    if (mainSidebar) mainSidebar.style.display = 'none';
    
    this.uiHandler.refreshMeetingElements();
    
    // Populate placeholders in transcription and suggestions areas
    const { transcriptionPlaceholder, suggestionsPlaceholder } = this.uiHandler.getTranslations();
    this.uiHandler.updateTranscription(transcriptionPlaceholder);
    this.uiHandler.updateSuggestions(suggestionsPlaceholder);
    
    // Resume previous session conversation if present
    if (this.app.sessionHandler && !this.app.sessionHandler.sessionId) {
      const storedSessionId = localStorage.getItem('currentSessionId');
      if (storedSessionId) {
        try {
          const memoryResp = await this.app.sessionHandler.resumeSession();
          const messages = memoryResp.memory_json?.messages || [];
          if(messages.length > 0){
          this.conversationContextHandler.conversationContextDialogs = messages;
            this.uiHandler.renderTranscription(
              this.conversationContextHandler.conversationContextDialogs,
              this.conversationContextHandler.startTime,
              this.conversationContextHandler.useRelativeTime
            );
          }
        } catch (err) {
          console.error('Error resuming session conversation:', err);
        }
      }
    }

    // Afficher la sidebar de réunion
    const meetingSidebar = document.querySelector('.meeting-sidebar');
    if (meetingSidebar) {
      meetingSidebar.style.display = 'flex';
      meetingSidebar.classList.remove('collapsed');
    }

    // Responsive elements initialization and event binding now handled in initialize()

    // S'assurer que l'affichage de la transcription est activé
    if (this.transcriptionSection) {
      this.transcriptionSection.style.display = 'flex';
      if (this.container) this.container.classList.add('no-transcription');
    }

    this.updateButtonStates();

  }

  async initialize() {
    // Hide global header and main sidebar on meeting page
    const header = document.querySelector('.header-horizontal');
    if (header) header.style.display = 'none';
    const mainSidebar = document.querySelector('.sidebar');
    if (mainSidebar) mainSidebar.style.display = 'none';

    console.log("MeetingPage initializing");
    
    // Initialiser les éléments UI
    this.initializeElements();
    this.bindEvents();
    // Attach keyboard shortcuts
    this.attachKeyboardShortcuts();
    
    // Initialiser le gestionnaire de mise en page responsive
    this.layoutManager.initialize();
    this.layoutManager.loadLayoutsFromLocalStorage();
    
    // Appliquer l'état de la sidebar depuis les préférences
    const savedState = this.dataStore.getFromLocalStorage('sidebarState') || 'default';
    this.layoutManager.applySidebarState(savedState);
    // Mettre à jour la visibilité et le contenu du bloc de contexte
    const contextHeaderElement = document.getElementById('conversationContextHeader');
    if (contextHeaderElement) {
      // Extract session_id from URL query
      const conversationId = localStorage.getItem('currentConversationId');
      if (conversationId) {
        try {
          // Fetch session data (includes context JSON)
          const resp = await this.apiHandler.callApi(
            `${this.apiHandler.baseURL}${this.apiHandler.apiPrefix}/conversation/${conversationId}/context`,
            { method: 'GET' }
          );
          const context = resp.context || {};
          console.log('context', context);
          // Build list of fields from config
          const allFields = meetingFieldsConfig.reduce((acc, cat) => acc.concat(cat.fields), []);
          let html = '<ul>';
          Object.entries(context).forEach(([key, val]) => {
            const fld = allFields.find(f => f.key === key);
            const label = fld ? fld.label : key;
            html += `<li><strong>${label}</strong>: ${val}</li>`;
          });
          html += '</ul>';
          contextHeaderElement.innerHTML = html;
        } catch (err) {
          console.error('Error fetching session context:', err);
          contextHeaderElement.innerText = this.uiHandler.selectedTranslations.sessionContextError || 'Erreur chargement contexte';
        }
      }
      // Show or hide header based on sidebar state
      if (savedState === 'expanded') contextHeaderElement.classList.remove('hidden');
      else contextHeaderElement.classList.add('hidden');
    }
    
    // Conversation language selector
    const convLangSelect = document.getElementById('conversationLangSelect');
    if (convLangSelect) {
      // Populate options from UIHandler.supportedLangs
      const langs = this.app.uiHandler.supportedLangs;
      convLangSelect.innerHTML = '';
      langs.forEach(l => {
        const opt = document.createElement('option'); opt.value = l.code; opt.textContent = l.label;
        convLangSelect.appendChild(opt);
      });
      // Default selection
      const savedLang = localStorage.getItem('conversationLanguage') || this.transcriptionHandler.language;
      convLangSelect.value = savedLang;
      // Apply saved conversation language to handler
      await this.transcriptionHandler.applyTranslation(savedLang);
      // Apply on change
      convLangSelect.addEventListener('change', e => {
        const newLang = e.target.value;
        this.transcriptionHandler.applyTranslation(newLang);
        localStorage.setItem('conversationLanguage', newLang);
      });
    }
    
    console.log("MeetingPage initialized");
  }

  // Fonctions pour la mise en page responsive
  toggleSidebar() {
    // Always retract one level
    if (!this.layoutManager) return;
    const current = this.layoutManager.sidebarState;
    let newState = current;
    if (current === 'expanded') newState = 'default';
    else if (current === 'default') newState = 'semi';
    else if (current === 'semi') newState = 'full';
    // if already 'full', stay
    this.layoutManager.applySidebarState(newState);
    this.dataStore.saveToLocalStorage('sidebarState', newState);
    // Hide context header unless fully expanded
    const contextHeaderElement = document.getElementById('conversationContextHeader');
    if (contextHeaderElement) {
      if (newState === 'expanded') contextHeaderElement.classList.remove('hidden');
      else contextHeaderElement.classList.add('hidden');
    }
  }

  toggleFullSidebar() {
    // Always extend one level
    if (!this.layoutManager) return;
    const current = this.layoutManager.sidebarState;
    let newState = current;
    if (current === 'full') newState = 'semi';
    else if (current === 'semi') newState = 'default';
    else if (current === 'default') newState = 'expanded';
    // if already 'expanded', stay
    this.layoutManager.applySidebarState(newState);
    this.dataStore.saveToLocalStorage('sidebarState', newState);
    // Show context header only if expanded
    const contextHeaderElement = document.getElementById('conversationContextHeader');
    if (contextHeaderElement) {
      if (newState === 'expanded') contextHeaderElement.classList.remove('hidden');
      else contextHeaderElement.classList.add('hidden');
    }
  }

  applyLayoutPreset(preset) {
    this.layoutManager.applyLayoutPreset(preset);
  }

  // Fonctions pour la gestion des captures audio
  toggleSystemCapture() {
    if (this.audioCapture.isSystemRecording) {
      this.stopSystemCapture();
    } else {
      this.startSystemCapture();
    }
  }

  toggleMicCapture() {
    if (this.audioCapture.isMicRecording) {
      this.stopMicCapture();
    } else {
      this.startMicCapture();
    }
  }

  async startSystemCapture() {
    console.log("Starting system capture");
    try {
      if (!this.audioCapture.isSystemRecording) {
        // Réinitialiser le contexte de conversation
        if (this.conversationContextHandler) {
          //this.app.conversationContextHandler.resetConversationContext();
          this.conversationContextHandler.lastSummaryTime = Date.now();
        }
        
        // Démarrer la capture système
        const started = await this.audioCapture.startSystemCapture();
        if (!started) {
          // Si la capture n'a pas démarré (annulation), on ne fait rien
          return;
        }
        
        // If using silence-mode, disable periodic buffer cleanup (we'll flush manually)
        this.audioCapture.stopBufferCleanup();
        
        // Mettre à jour l'interface
        this.uiHandler.toggleCaptureButton(this.SYSTEM_SOURCE, true);
        this.uiHandler.populateVideoElement(this.audioCapture.systemMediaStream);
        
        // Transcription : silence-mode ou polling
          // use consolidated silence-mode handlers for system source
          this.setupSilenceModeHandlers(this.SYSTEM_SOURCE);
   
        
        
        // Mettre à jour l'état des boutons
        this.updateButtonStates();
      }
    } catch (error) {
      console.error('Error starting system capture:', error);
      // En cas d'erreur, on s'assure que le bouton reste dans son état initial
      this.uiHandler.toggleCaptureButton(this.SYSTEM_SOURCE, false);
    }
  }

  stopSystemCapture() {
    console.log("Stopping system capture");
    if (this.audioCapture.isSystemRecording) {
      // Clear the transcription interval
      if (this.audioCapture.systemTranscriptionInterval) {
        clearInterval(this.audioCapture.systemTranscriptionInterval);
        this.audioCapture.systemTranscriptionInterval = null;
      }
      // clear scheduled auto-flush
      if (this.systemSilenceTimeoutId) {
        clearTimeout(this.systemSilenceTimeoutId);
        this.systemSilenceTimeoutId = null;
      }
      // Flush last audio chunks before stopping
      if (this.audioCapture.systemBuffer.length > 0) {
        // Combine raw PCM chunks
        const allSamples = this.audioCapture.systemBuffer.reduce((acc, val) => {
          const tmp = new Float32Array(acc.length + val.length);
          tmp.set(acc, 0);
          tmp.set(val, acc.length);
          return tmp;
        }, new Float32Array());
        // Clear buffer and reset utterance state
        this.audioCapture.systemBuffer = [];
        this.audioCapture.utteranceInProgress.system = false;
        // Limit to last N seconds
        const sampleRate = this.audioCapture.systemAudioContext?.sampleRate || 44100;
        const maxSamples = sampleRate * this.maxSamplesDurationSec;
        const finalSamples = allSamples.length > maxSamples
          ? allSamples.subarray(allSamples.length - maxSamples)
          : allSamples;
        try {
          this.triggerTranscription(this.SYSTEM_SOURCE, finalSamples);
        } catch (err) {
          console.error('Error triggering transcription on stop:', err);
        }
      }
      this.audioCapture.stopSystemCapture();
      this.uiHandler.toggleCaptureButton(this.SYSTEM_SOURCE, false);
      this.uiHandler.closeVideoElement();
      // Clear silence-detection handlers
      this.audioCapture.onUtteranceStart = null;
      this.audioCapture.onUtteranceEnd = null;
      this.updateButtonStates();
    }
  }

  async startMicCapture() {
        
    console.log("Starting mic capture");
    try {
      if (!this.audioCapture.isMicRecording) {
        const started = await this.audioCapture.startMicCapture();
        if (!started) {
          // Si la capture n'a pas démarré (annulation), on ne fait rien
          return;
        }
        // If using silence-mode, disable periodic buffer cleanup for mic as well
          this.audioCapture.stopBufferCleanup();

        this.uiHandler.toggleCaptureButton(this.MIC_SOURCE, true);
        // Transcription : silence-mode ou polling
          console.log("Using Silence Mode : Mic")
          // use consolidated silence-mode handlers for mic source
          this.setupSilenceModeHandlers(this.MIC_SOURCE);
   
        
        this.updateButtonStates();
      }
    } catch (error) {
      console.error('Error starting mic capture:', error);
      this.uiHandler.toggleCaptureButton(this.MIC_SOURCE, false);
    }
  }

  stopMicCapture() {
    console.log("Stopping mic capture");
    if (this.audioCapture.isMicRecording) {
      // Clear the transcription interval
      if (this.audioCapture.micTranscriptionInterval) {
        clearInterval(this.audioCapture.micTranscriptionInterval);
        this.audioCapture.micTranscriptionInterval = null;
      }
      // clear scheduled auto-flush
      if (this.micSilenceTimeoutId) {
        clearTimeout(this.micSilenceTimeoutId);
        this.micSilenceTimeoutId = null;
      }
      // Flush last audio chunks before stopping
      if (this.audioCapture.micRawBuffer.length > 0) {
        // Combine raw PCM chunks
        const allSamples = this.audioCapture.micRawBuffer.reduce((acc, val) => {
          const tmp = new Float32Array(acc.length + val.length);
          tmp.set(acc, 0);
          tmp.set(val, acc.length);
          return tmp;
        }, new Float32Array());
        this.audioCapture.micRawBuffer = [];
        this.audioCapture.utteranceInProgress.mic = false;
        // Limit to last N seconds
        const sampleRate = this.audioCapture.micAudioContext?.sampleRate || 44100;
        const maxSamples = sampleRate * this.maxSamplesDurationSec;
        const finalSamples = allSamples.length > maxSamples
          ? allSamples.subarray(allSamples.length - maxSamples)
          : allSamples;
        try {
          this.triggerTranscription(this.MIC_SOURCE, finalSamples);
        } catch (err) {
          console.error('Error triggering transcription on mic stop:', err);
        }
      }
      this.audioCapture.stopMicCapture();
      this.uiHandler.toggleCaptureButton(this.MIC_SOURCE, false);
      // Clear silence-detection handlers
      this.audioCapture.onUtteranceStart = null;
      this.audioCapture.onUtteranceEnd = null;
      this.updateButtonStates();
    }
  }

  async startSuggestionsStreaming() {
    if (this.conversationContextHandler) {
      const eventSource = await this.suggestionsHandler.startSuggestionsStreaming(this.conversationContextHandler.conversationId);
      eventSource.onmessage = async (e) => {
        const data = e.data;
        if (data === '[DONE]') {

          eventSource.close();

                // Enregistrer la suggestion dans le conversationContextHandler
          if (this.conversationContextHandler) {
            this.conversationContextHandler.conversationContextSuggestions.push({
              id: `${this.conversationContextHandler.conversationId}-${Date.now()}`,
              generated_after_dialog_id: this.conversationContextHandler.conversationContextDialogs[this.conversationContextHandler.conversationContextDialogs.length - 1].id,
              text: this.suggestionsHandler.suggestionsMessage,
              time: Date.now(),
              language: this.app.currentLanguage
            });
          }

      this.suggestionsHandler.suggestionsMessage = '';
      console.log("Streaming done");

          // Save suggestions to backend
          try {
            const sessionId = localStorage.getItem('currentSessionId');
            const conversationId = this.conversationContextHandler.conversationId;
            await this.apiHandler.callApi(
              `${this.apiHandler.baseURL}${this.apiHandler.apiPrefix}/suggestions/save`,
              {
                method: 'POST',
                body: JSON.stringify({
                  session_id: sessionId,
                  conversation_id: conversationId,
                  suggestions: this.conversationContextHandler.conversationContextSuggestions
                })
              }
            );
          } catch (e) {
            console.error('Error saving suggestions:', e);
          }
          
        } else {
          const jsonData = JSON.parse(data);
          this.suggestionsHandler.suggestionsMessage += jsonData.choices?.[0]?.delta?.content || '';
          this.uiHandler.updateSuggestions(this.suggestionsHandler.suggestionsMessage);
        }
      }
      eventSource.onerror = (e) => {
        console.error("Error starting suggestions streaming:", e);
      }
    }
  }

  // Helper to trigger transcription for any audio segment
  async triggerTranscription(src, audioBuffer) {
    console.log(`Triggering Transcription for ${src}`);
    const speakerLabel = src === this.SYSTEM_SOURCE ? this.systemLabel : this.micLabel;
    const sampleRate = (src === this.SYSTEM_SOURCE
      ? this.audioCapture.systemAudioContext?.sampleRate
      : this.audioCapture.micAudioContext?.sampleRate) || 44100;
    const wavBlob = this.transcriptionHandler.bufferToWaveBlob(audioBuffer, sampleRate);
    const transcription = await this.transcriptionHandler.transcribeAudio(wavBlob);
    if (transcription) {
      console.log(`Transcription (${speakerLabel}):`, transcription);
      const filteredText = filterTranscription(transcription, this.app.currentLanguage) || transcription;
      if (filteredText) {
        // Update conversation context
        if (this.conversationContextHandler) {
          const timestamp = Date.now();
          const dialog = {  
            id: `${this.conversationContextHandler.conversationId}-${timestamp}`,
            speaker: speakerLabel,
            text: filteredText,
            time: timestamp,
            language: this.app.currentLanguage,
            source: src
          };
          this.conversationContextHandler.conversationContextDialogs.push(dialog);
          if (this.conversationContextHandler.unsentMessages) {
            this.conversationContextHandler.unsentMessages.push(dialog);
          }
          this.conversationContextHandler.sendConversationMessage();
          this.uiHandler.renderTranscription(
            this.conversationContextHandler.conversationContextDialogs,
            this.conversationContextHandler.startTime,
            this.conversationContextHandler.useRelativeTime
          );
        } else {
          this.uiHandler.updateTranscription(filteredText);
        }
      }
    }
  }

  // Helper: assign silence-mode utterance handlers and manage auto-flush timeouts
  setupSilenceModeHandlers(src) {
    console.log("Using silence mode");
    console.log(`setupSilenceModeHandlers called for source: ${src}`);
    this.audioCapture.onUtteranceStart = (src) => {
      console.log(`Utterance started for source: ${src}`);
      if (src === this.SYSTEM_SOURCE && this.systemSilenceTimeoutId) {
        clearTimeout(this.systemSilenceTimeoutId);
        this.systemSilenceTimeoutId = null;
      } else if (src === this.MIC_SOURCE && this.micSilenceTimeoutId) {
        clearTimeout(this.micSilenceTimeoutId);
        this.micSilenceTimeoutId = null;
      }

      if (this.enableSilenceTimeout) {
        // Schedule initial auto-flush if enabled
        const timeoutId = setTimeout(async () => {
          console.log(`Auto-flush callback for ${src}`);
          const isRecording = src === this.SYSTEM_SOURCE
            ? this.audioCapture.isSystemRecording
            : this.audioCapture.isMicRecording;
          const buffer = src === this.SYSTEM_SOURCE
            ? this.audioCapture.systemBuffer
            : this.audioCapture.micBuffer;
          if (isRecording && buffer.length > 0) {
            // Combine raw PCM chunks
            const allSamples = buffer.reduce((acc, chunk) => {
              const combined = new Float32Array(acc.length + chunk.length);
              combined.set(acc, 0);
              combined.set(chunk, acc.length);
              return combined;
            }, new Float32Array());
            // Clear buffer and reset utterance state
            buffer.length = 0;
            this.audioCapture.utteranceInProgress[src] = false;
            // Limit to last N seconds to avoid huge payloads
            const sampleRate = (src === this.SYSTEM_SOURCE
              ? this.audioCapture.systemAudioContext?.sampleRate
              : this.audioCapture.micAudioContext?.sampleRate) || 44100;
            const maxSamples = sampleRate * this.maxSamplesDurationSec;
            const finalSamples = allSamples.length > maxSamples
              ? allSamples.subarray(allSamples.length - maxSamples)
              : allSamples;
            try {
              await this.triggerTranscription(src, finalSamples);
            } catch (err) {
              console.error(`Error triggering transcription on auto-flush for ${src}:`, err);
            } finally {
              this.silenceTranscribing[src] = false;
            }
          }
        }, this.silenceTimeoutDuration);
        if (src === this.SYSTEM_SOURCE) {
          this.systemSilenceTimeoutId = timeoutId;
        } else if (src === this.MIC_SOURCE) {
          this.micSilenceTimeoutId = timeoutId;
        }
      }
    };

    this.audioCapture.onUtteranceEnd = async (src, audioBuffer) => {
      
      console.log(`Utterance ended for source: ${src}`);
      // Clear existing timeout
      if (src === this.SYSTEM_SOURCE && this.systemSilenceTimeoutId) {
        clearTimeout(this.systemSilenceTimeoutId);
        this.systemSilenceTimeoutId = null;
      } else if (src === this.MIC_SOURCE && this.micSilenceTimeoutId) {
        clearTimeout(this.micSilenceTimeoutId);
        this.micSilenceTimeoutId = null;
      }
      // Wrap transcription and rescheduling in try/catch to avoid silent failures
      try {
        await this.triggerTranscription(src, audioBuffer);
      } catch (err) {
        console.error(`Error in onUtteranceEnd for ${src}:`, err);
      }

    };
  }

  // Add init alias for Router to call render and then initialize
  async init() {
    // Render the meeting page UI
    await this.render();
    // Call additional initialize logic if present
    if (typeof this.initialize === 'function') {
      await this.initialize();
    }
  }

  /**
   * Capture a frame from the screen-capture video and generate a PNG data URL
   */
  async captureImage() {
    const video = document.getElementById('screen-capture');
    if (!video) {
      console.error('Video element not found for screen capture');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/png');
    console.log('Captured image data URL:', imageData);
    // Display the captured image as a thumbnail in the screen capture area
    const container = document.querySelector('#screenCaptureArea .area-content');
    if (container) {
      let thumbnail = container.querySelector('.capture-thumbnail');
      if (!thumbnail) {
        thumbnail = document.createElement('img');
        thumbnail.className = 'capture-thumbnail';
        container.appendChild(thumbnail);
      }
      thumbnail.src = imageData;
      // Analyze the captured image and display description
      try {
        const result = await this.apiHandler.analyzeImage(imageData);
        let descEl = container.querySelector('.analysis-description');
        if (!descEl) {
          descEl = document.createElement('div');
          descEl.className = 'analysis-description';
          container.appendChild(descEl);
        }
        descEl.textContent = result.description || 'No description received';
      } catch (err) {
        console.error('Image analysis failed:', err);
      }
    } else {
      console.error('Container for thumbnail not found');
    }
  }

  /**
   * Attach global keyboard shortcuts
   */
  attachKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Require Ctrl + Alt
      if (!e.ctrlKey || !e.altKey) return;
      const key = e.key.toLowerCase();
      shortcuts.forEach((sc) => {
        if (
          key === sc.key &&
          e.ctrlKey === sc.ctrl &&
          e.altKey === sc.alt &&
          e.shiftKey === sc.shift
        ) {
          e.preventDefault();
          // Call corresponding method
          if (typeof this[sc.method] === 'function') {
            this[sc.method]();
          }
        }
      });
    });
  }

  /**
   * Toggle the layout presets panel
   */
  toggleLayoutPresets() {
    this.layoutManager.toggleLayoutPresetsPanel();
  }

  /**
   * Toggle transcription area visibility
   */
  toggleTranscriptionArea() {
    const area = document.getElementById('transcriptionArea');
    if (area) {
      area.style.display = area.style.display === 'none' ? 'flex' : 'none';
    }
  }

  /**
   * Toggle suggestions area visibility
   */
  toggleSuggestionsArea() {
    const area = document.getElementById('suggestionsArea');
    if (area) {
      area.style.display = area.style.display === 'none' ? 'flex' : 'none';
    }
  }

  /**
   * Manually flush audio buffers for silence-mode transcription.
   */
  async manualFlush() {
    console.log("Manual flush triggered");
    const sources = [this.SYSTEM_SOURCE, this.MIC_SOURCE];
    for (const src of sources) {
      // choose correct buffer
      const buffer = src === this.SYSTEM_SOURCE
        ? this.audioCapture.systemBuffer
        : this.audioCapture.micRawBuffer;
      if (buffer.length > 0 && !this.silenceTranscribing[src]) {
        this.silenceTranscribing[src] = true;
        console.log(`Manual flush: flushing ${buffer.length} ${src} chunks`);
        // Combine buffered chunks
        const allSamples = buffer.reduce((acc, val) => {
          const tmp = new Float32Array(acc.length + val.length);
          tmp.set(acc, 0);
          tmp.set(val, acc.length);
          return tmp;
        }, new Float32Array());
        // Clear buffer and reset utterance state
        if (src === this.SYSTEM_SOURCE) {
          this.audioCapture.systemBuffer = [];
          this.audioCapture.utteranceInProgress.system = false;
        } else {
          this.audioCapture.micRawBuffer = [];
          this.audioCapture.utteranceInProgress.mic = false;
        }
        try {
          await this.triggerTranscription(src, allSamples);
        } catch (err) {
          console.error(`Error in manual flush for ${src}:`, err);
        } finally {
          this.silenceTranscribing[src] = false;
        }
      }
    }
  }
} 