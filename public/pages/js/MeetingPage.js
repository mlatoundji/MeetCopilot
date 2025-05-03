import { BackupHandler } from '../../modules/backupHandler.js';

export class MeetingPage {
  constructor(app) {
    this.app = app;
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
    this.homeControls = document.getElementById('home-controls');
    this.meetingControls = document.getElementById('meeting-controls');
    this.transcriptionSection = document.querySelector('.transcription');
    this.container = document.querySelector('.container');
    this.saveAndQuitButton = document.getElementById('saveAndQuitButton');
    this.quitButton = document.getElementById('quitButton');
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
        this.saveAndQuitButton.classList.add('save-success');
        setTimeout(() => {
          this.saveAndQuitButton.classList.remove('save-success');
          this.handleQuit();
        }, 500);
      })
      .catch(error => {
        console.error('Error saving meeting data:', error);
        alert('Error saving meeting data. Please try again.');
      });
  }

  handleQuit() {
    this.app.backupHandler.clearMeetingData();
    window.location.hash = 'home';
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

  async render() {
    await this.loadFragment();
    this.app.uiHandler.refreshMeetingElements();
    // Hide sidebar navigation links in meeting
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (sidebarNav) sidebarNav.style.display = 'none';
    this.initializeElements();
    this.bindEvents();

    if (this.homeControls) this.homeControls.style.display = 'none';
    if (this.meetingControls) this.meetingControls.style.display = 'block';

    if (this.transcriptionSection) {
      this.transcriptionSection.style.display = 'flex';
      if (this.container) this.container.classList.remove('no-transcription');
    }

    this.updateButtonStates();
  }
} 