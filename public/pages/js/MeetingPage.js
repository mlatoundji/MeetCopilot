import { BackupHandler } from '../../modules/backupHandler.js';
import { APIHandler } from '../../modules/apiHandler.js';
import { UIHandler } from '../../modules/uiHandler.js';
import { TranscriptionHandler } from '../../modules/transcriptionHandler.js';
import { SuggestionsHandler } from '../../modules/suggestionsHandler.js';
import { DataStore } from '../../modules/dataStore.js';
import { AudioCapture } from '../../modules/audioCapture.js';
import { LayoutManager } from '../../modules/layoutManager.js';

export class MeetingPage {
  constructor(app) {
    this.app = app;
    this.apiHandler = app?.apiHandler || new APIHandler();
    this.dataStore = app?.dataStore || new DataStore(this.apiHandler);
    this.uiHandler = app?.uiHandler || new UIHandler();
    this.transcriptionHandler = app?.transcriptionHandler || new TranscriptionHandler(this.apiHandler);
    this.suggestionsHandler = app?.suggestionsHandler || new SuggestionsHandler(this.apiHandler);
    this.audioCapture = app?.audioCapture || new AudioCapture();
    this.layoutManager = new LayoutManager();

    // Constantes pour les sources audio
    this.SYSTEM_SOURCE = 'system';
    this.MIC_SOURCE = 'mic';

    this.isRecording = false;
    this.systemCapture = null;
    this.micCapture = null;
    this.selectedTranslations = this.uiHandler.getTranslations();
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
    this.transcriptionSection = document.querySelector('.transcription');
    this.container = document.querySelector('.container');
    this.saveAndQuitButton = document.getElementById('saveAndQuitButton');
    this.quitButton = document.getElementById('quitButton');
    this.meetingContentGrid = document.getElementById('meetingContentGrid');
    this.meetingSidebar = document.getElementById('meetingSidebar');

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
      this.suggestionButton.addEventListener('click', () => this.generateSuggestion());
    }
    if (this.saveAndQuitButton) {
      this.saveAndQuitButton.addEventListener('click', () => this.saveAndQuitMeeting());
    }
    if (this.quitButton) {
      this.quitButton.addEventListener('click', () => this.quitMeeting());
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
  }

  saveAndQuitMeeting() {
    if (this.app && this.app.backupHandler) {
      this.app.backupHandler.saveMeetingData()
        .then(() => {
          if (this.saveAndQuitButton) {
            this.saveAndQuitButton.classList.add('save-success');
          }
          setTimeout(() => {
            if (this.saveAndQuitButton) {
              this.saveAndQuitButton.classList.remove('save-success');
            }
            this.quitMeeting();
          }, 500);
        })
        .catch(error => {
          console.error('Error saving meeting data:', error);
          alert('Error saving meeting data. Please try again.');
        });
    } else {
      console.error('No backup handler available');
      this.quitMeeting();
    }
  }

  quitMeeting() {
    // Arrêter les enregistrements audio
    if (this.audioCapture.isSystemRecording) {
      this.toggleSystemCapture();
    }
    if (this.audioCapture.isMicRecording) {
      this.toggleMicCapture();
    }
    
    // Nettoyer les données de réunion
    if (this.app && this.app.backupHandler) {
      this.app.backupHandler.clearMeetingData();
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
    
    // Afficher la sidebar de réunion
    const meetingSidebar = document.querySelector('.meeting-sidebar');
    if (meetingSidebar) {
      meetingSidebar.style.display = 'flex';
      meetingSidebar.classList.remove('collapsed');
    }

    // S'assurer que les éléments responsive sont correctement initialisés
    this.initializeElements();
    this.bindEvents();

    // S'assurer que l'affichage de la transcription est activé
    if (this.transcriptionSection) {
      this.transcriptionSection.style.display = 'flex';
      if (this.container) this.container.classList.remove('no-transcription');
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
    
    // Initialiser le gestionnaire de mise en page responsive
    this.layoutManager.initialize();
    this.layoutManager.loadLayoutsFromLocalStorage();
    
    console.log("MeetingPage initialized");
  }

  // Fonctions pour la mise en page responsive
  toggleSidebar() {
    if (this.meetingSidebar) {
      this.meetingSidebar.classList.toggle('collapsed');
      if (this.meetingContentGrid) {
        this.meetingContentGrid.style.marginLeft = 
          this.meetingSidebar.classList.contains('collapsed') ? '60px' : '250px';
      }
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
    try {
      if (!this.audioCapture.isSystemRecording) {
        // Réinitialiser le contexte de conversation
        if (this.app && this.app.conversationContextHandler) {
          this.app.conversationContextHandler.resetConversationContext();
          this.app.conversationContextHandler.lastSummaryTime = Date.now();
        }
        
        // Démarrer la capture système
        const started = await this.audioCapture.startSystemCapture();
        if (!started) {
          // Si la capture n'a pas démarré (annulation), on ne fait rien
          return;
        }
        
        // Mettre à jour l'interface
        this.uiHandler.toggleCaptureButton(this.SYSTEM_SOURCE, true);
        this.uiHandler.populateVideoElement(this.audioCapture.systemMediaStream);
        
        // Démarrer la transcription
        await this.startTranscription(this.SYSTEM_SOURCE);
        
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
    if (this.audioCapture.isSystemRecording) {
      // Clear the transcription interval
      if (this.audioCapture.systemTranscriptionInterval) {
        clearInterval(this.audioCapture.systemTranscriptionInterval);
        this.audioCapture.systemTranscriptionInterval = null;
      }
      
      this.audioCapture.stopSystemCapture();
      this.uiHandler.toggleCaptureButton(this.SYSTEM_SOURCE, false);
      this.uiHandler.closeVideoElement();
      this.updateButtonStates();
    }
  }

  async startMicCapture() {
    try {
      if (!this.audioCapture.isMicRecording) {
        await this.audioCapture.startMicCapture();
        this.uiHandler.toggleCaptureButton(this.MIC_SOURCE, true);
        await this.startTranscription(this.MIC_SOURCE);
        this.updateButtonStates();
      }
    } catch (error) {
      console.error('Error starting mic capture:', error);
      this.uiHandler.toggleCaptureButton(this.MIC_SOURCE, false);
    }
  }

  stopMicCapture() {
    if (this.audioCapture.isMicRecording) {
      // Clear the transcription interval
      if (this.audioCapture.micTranscriptionInterval) {
        clearInterval(this.audioCapture.micTranscriptionInterval);
        this.audioCapture.micTranscriptionInterval = null;
      }
      
      this.audioCapture.stopMicCapture();
      this.uiHandler.toggleCaptureButton(this.MIC_SOURCE, false);
      this.updateButtonStates();
    }
  }

  async startTranscription(source) {
    let isTranscribing = false;
    const intervalId = setInterval(async () => {
      if (isTranscribing) return;
      const buffer = source === this.SYSTEM_SOURCE ? this.audioCapture.systemBuffer : this.audioCapture.micBuffer;
      const contextLabel = source === this.SYSTEM_SOURCE ? 
        this.app.conversationContextHandler.systemLabel : 
        this.app.conversationContextHandler.micLabel;

      if (buffer.length > 0) {
        isTranscribing = true;
        try {
          // Calculate total length of all buffers
          const totalLength = buffer.reduce((sum, chunk) => sum + chunk.length, 0);

          // Create a single Float32Array of the total length
          const audioBuffer = new Float32Array(totalLength);

          // Copy each buffer chunk sequentially
          let offset = 0;
          for (const chunk of buffer) {
            audioBuffer.set(chunk, offset);
            offset += chunk.length;
          }

          // Clear the original buffer
          buffer.length = 0;

          // Determine correct sample rate from audio context
          const sampleRate = (source === this.SYSTEM_SOURCE
            ? this.audioCapture.systemAudioContext?.sampleRate
            : this.audioCapture.micAudioContext?.sampleRate) || 44100;
          const wavBlob = this.transcriptionHandler.bufferToWaveBlob(audioBuffer, sampleRate);

          const transcription = await this.transcriptionHandler.transcribeAudio(wavBlob);
          if (transcription) {
            console.log(`Transcription (${contextLabel}):`, transcription);
            if (this.app.filterTranscription) {
              const filteredText = this.app.filterTranscription(transcription, this.app.currentLanguage);
              if (filteredText === "") return;

              this.app.conversationContextHandler.conversationContextDialogs.push({
                speaker: contextLabel,
                text: filteredText,
                time: Date.now(),
                language: this.app.currentLanguage,
                source: source
              });
              await this.app.conversationContextHandler.updateConversationContext();
              this.uiHandler.updateTranscription(this.app.conversationContextHandler.conversationContextText);
            }
          }
        } catch (error) {
          console.error('Error in transcription loop:', error.message || error);
        } finally {
          isTranscribing = false;
        }
      }
    }, this.audioCapture.timeslice);

    if (source === this.SYSTEM_SOURCE) {
      this.audioCapture.systemTranscriptionInterval = intervalId;
    } else {
      this.audioCapture.micTranscriptionInterval = intervalId;
    }
  }

  async generateSuggestion() {
    try {
      let context;
      if (this.app && this.app.conversationContextHandler) {
        context = this.app.conversationContextHandler.conversationContextText;
        console.log("Conversation context handler text loaded");
      } else {
        context = document.getElementById('transcription').innerText;
        console.log("Transcription box text loaded");
      }
      
      if (!context || context.trim() === '') {
        this.uiHandler.updateSuggestions("Pas de contexte de conversation suffisant pour générer des suggestions.");
        return;
      }

      const suggestions = await this.suggestionsHandler.generateSuggestions(context);
      this.uiHandler.updateSuggestions(suggestions);
      
      // Enregistrer la suggestion dans le conversationContextHandler
      if (this.app && this.app.conversationContextHandler) {
        this.app.conversationContextHandler.conversationContextSuggestions.push({
          text: suggestions,
          time: Date.now(),
          language: this.app.currentLanguage
        });
      }
      
      // Enregistrer la suggestion dans le backupHandler si disponible
      if (this.app && this.app.backupHandler) {
        this.app.backupHandler.addSuggestion(suggestions);
      }
    } catch (error) {
      console.error("Error generating suggestion:", error);
      this.uiHandler.updateSuggestions("Erreur lors de la génération des suggestions.");
    }
  }
} 