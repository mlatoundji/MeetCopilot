import { BackupHandler } from '../modules/backupHandler.js';

export class MeetingPage {
  constructor(app) {
    this.app = app;
    this.initializeElements();
    this.bindEvents();
  }

  initializeElements() {
    this.systemCaptureButton = document.getElementById('systemCaptureButton');
    this.micCaptureButton = document.getElementById('micCaptureButton');
    this.suggestionButton = document.getElementById('suggestionButton');
    this.transcriptionBox = document.querySelector('.transcription-box');
    this.screenCaptureSection = document.getElementById('screen-capture-section');
    this.suggestionsContainer = document.querySelector('.suggestions-container');
    this.homeControls = document.getElementById('home-controls');
    this.meetingControls = document.getElementById('meeting-controls');
    this.transcriptionSection = document.querySelector('.transcription');
    this.container = document.querySelector('.container');
    this.saveAndQuitButton = document.getElementById('saveAndQuitButton');
    this.quitButton = document.getElementById('quitButton');
    
    this.setupTranscriptionContainer();
  }

  setupTranscriptionContainer() {
    // S'assurer que le conteneur de transcription a une taille fixe avec défilement
    if (this.transcriptionBox) {
      this.transcriptionBox.style.maxHeight = '70vh';
      this.transcriptionBox.style.overflowY = 'auto';
      this.transcriptionBox.style.padding = '1rem';
      this.transcriptionBox.style.border = '1px solid var(--border-color)';
      this.transcriptionBox.style.borderRadius = '8px';
    }
  }

  bindEvents() {
    if (this.systemCaptureButton) {
      this.systemCaptureButton.addEventListener('click', () => this.app.handleSystemCapture());
    }
    if (this.micCaptureButton) {
      this.micCaptureButton.addEventListener('click', () => this.app.handleMicCapture());
    }
    if (this.suggestionButton) {
      this.suggestionButton.addEventListener('click', () => this.app.handleGenerateSuggestions());
    }
    if (this.saveAndQuitButton) {
      this.saveAndQuitButton.addEventListener('click', () => this.handleSaveAndQuit());
    }
    if (this.quitButton) {
      this.quitButton.addEventListener('click', () => this.handleQuit());
    }
  }

  async handleSaveAndQuit() {
 
    this.app.backupHandler.saveMeetingData()
      .then(() => {
        // Show success animation
        this.saveAndQuitButton.classList.add('save-success');
        setTimeout(() => {
          this.saveAndQuitButton.classList.remove('save-success');
          this.handleQuit();
        }, 500);
      })
      .catch(error => {
        console.error('Error saving meeting data:', error);
        // Show error message to user
        alert('Error saving meeting data. Please try again.');
      });
  }

  handleQuit() {
    // Clear meeting data
    this.app.backupHandler.clearMeetingData();
    // Navigate back to home page
    window.location.href = '/';
  }

  render() {
    // Assurez-vous que seul l'onglet Current Meeting est visible
    document.querySelectorAll('.tab').forEach(tab => {
      const tabId = tab.getAttribute('data-tab');
      if (tabId === 'current-meeting') {
        tab.style.display = 'block';
      } else {
        tab.style.display = 'none';
      }
    });

    // Activer l'onglet Current Meeting
    document.querySelector('[data-tab="current-meeting"]').click();
    
    // Configurer les contrôles pour la page de réunion
    if (this.homeControls) {
      this.homeControls.style.display = 'none';
    }
    
    if (this.meetingControls) {
      this.meetingControls.style.display = 'block';
    }
    
    // Afficher la transcription sur la page de réunion
    if (this.transcriptionSection) {
      this.transcriptionSection.style.display = 'flex';
      
      // Retirer la classe no-transcription pour revenir à la mise en page standard
      if (this.container) {
        this.container.classList.remove('no-transcription');
      }
    }
    
    
    // Mettre à jour l'état des boutons selon l'état de capture
    this.updateButtonStates();
  }

  updateButtonStates() {
    if (this.systemCaptureButton) {
      this.systemCaptureButton.textContent = this.app.audioCapture.isSystemRecording ? 
        this.app.uiHandler.selectedTranslations.systemButtonStop : 
        this.app.uiHandler.selectedTranslations.systemButtonStart;
    }
    
    if (this.micCaptureButton) {
      this.micCaptureButton.textContent = this.app.audioCapture.isMicRecording ? 
        this.app.uiHandler.selectedTranslations.micButtonStop : 
        this.app.uiHandler.selectedTranslations.micButtonStart;
    }
  }

  show() {
    if (this.transcriptionSection) {
      this.transcriptionSection.style.display = 'block';
    }
    if (this.suggestionsContainer) {
      this.suggestionsContainer.style.display = 'block';
    }
  }

  hide() {
    if (this.transcriptionSection) {
      this.transcriptionSection.style.display = 'none';
    }
    if (this.suggestionsContainer) {
      this.suggestionsContainer.style.display = 'none';
    }
  }
} 