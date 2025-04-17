import { BackupHandler } from '../modules/backupHandler.js';

export class HomePage {
  constructor(app) {
    this.app = app;
    this.initializeElements();
    this.bindEvents();
  }

  initializeElements() {
    this.dashboardContainer = document.querySelector('.dashboard-grid');
    this.sessionControlButton = document.getElementById('sessionControlButton');
    this.homeControls = document.getElementById('home-controls');
    this.meetingControls = document.getElementById('meeting-controls');
    this.transcriptionSection = document.querySelector('.transcription');
    this.container = document.querySelector('.container');
  }

  bindEvents() {
    if (this.sessionControlButton) {
      this.sessionControlButton.addEventListener('click', () => this.app.handleSessionControl());
    }
  }

  handleSessionControl() {
    this.app.handleSessionControl();
    this.app.backupHandler.initializeMeeting();
  }

  render() {
    // Assurez-vous que les onglets Dashboard, History et Settings sont visibles
    document.querySelectorAll('.tab').forEach(tab => {
      const tabId = tab.getAttribute('data-tab');
      if (tabId === 'dashboard' || tabId === 'history' || tabId === 'settings') {
        tab.style.display = 'block';
      } else {
        tab.style.display = 'none';
      }
    });

    // Activer l'onglet Dashboard par défaut
    document.querySelector('[data-tab="dashboard"]').click();
    
    // Configurer les contrôles pour la page d'accueil
    if (this.homeControls) {
      this.homeControls.style.display = 'block';
    }
    
    if (this.meetingControls) {
      this.meetingControls.style.display = 'none';
    }
    
    // Masquer la transcription sur la page d'accueil
    if (this.transcriptionSection) {
      this.transcriptionSection.style.display = 'none';
      
      // Ajouter la classe no-transcription pour ajuster la mise en page
      if (this.container) {
        this.container.classList.add('no-transcription');
      }
    }
    
    // Mise à jour du bouton de contrôle de session
    if (this.sessionControlButton) {
      this.sessionControlButton.textContent = this.app.uiHandler.selectedTranslations.startSessionButton;
      // this.sessionControlButton.textContent = this.app.sessionActive ? 
      //   this.app.uiHandler.selectedTranslations.sessionButtonStop : 
      //   this.app.uiHandler.selectedTranslations.startSessionButton;
    }
  }
} 