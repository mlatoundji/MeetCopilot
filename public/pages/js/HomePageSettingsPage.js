export default class SettingsPage {
  constructor(app) {
    this.app = app;
    this.apiHandler = app.apiHandler;
  }

  async init() {
    this.setupEventListeners();
    await this.loadSettings();
  }

  render() {
    // Static content loaded via HTML fragment
  }

  async loadSettings() {
    try {
      const url = `${this.apiHandler.baseURL}/api/settings`;
      const settings = await this.apiHandler.callApi(url, { method: 'GET' });

      // Theme
      const themeSelect = document.getElementById('themeSelect');
      if (themeSelect && settings.theme) themeSelect.value = settings.theme;

      // Interface Language (header dropdown)
      const langSelect = document.getElementById('langSelect');
      if (langSelect && settings.language) langSelect.value = settings.language;

      // Audio Input Devices
      const audioSelect = document.getElementById('audioInputSelect');
      if (audioSelect && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        audioInputs.forEach(device => {
          const option = document.createElement('option');
          option.value = device.deviceId;
          option.textContent = device.label || `Device ${device.deviceId}`;
          audioSelect.appendChild(option);
        });
        if (settings.notifications && settings.notifications.audioInputDevice) {
          audioSelect.value = settings.notifications.audioInputDevice;
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  setupEventListeners() {
    const saveBtn = document.getElementById('saveSettingsButton');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const themeSelect = document.getElementById('themeSelect');
        const languageSelect = document.getElementById('langSelect');
        const audioSelect = document.getElementById('audioInputSelect');

        const theme = themeSelect ? themeSelect.value : null;
        const language = languageSelect ? languageSelect.value : null;
        const notifications = {};
        if (audioSelect) notifications.audioInputDevice = audioSelect.value;

        try {
          const url = `${this.apiHandler.baseURL}/api/settings`;
          await this.apiHandler.callApi(url, {
            method: 'PATCH',
            body: JSON.stringify({ theme, language, notifications })
          });
          alert('Settings updated successfully');
        } catch (error) {
          console.error('Error saving settings:', error);
          alert('Failed to save settings');
        }
      });
    }
  }
} 