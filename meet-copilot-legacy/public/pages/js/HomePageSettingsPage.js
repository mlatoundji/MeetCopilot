export default class SettingsPage {
  constructor(app) {
    this.app = app;
    this.apiHandler = app.apiHandler;
  }

  async init() {
    this.setupEventListeners();
    await this.loadSettings();
    await this.translateStatic();
  }

  /**
   * Translate static UI elements marked with data-i18n
   */
  async translateStatic() {
    // Load UI translations
    const lang = this.app.currentLanguage;
    const translations = await this.app.uiHandler.i18n.load(lang);
    document.querySelectorAll('.main-content [data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = translations[key] || el.textContent;
    });
  }

  render() {
    // Static content loaded via HTML fragment
  }

  async loadSettings() {
    try {
      // Populate header Interface Language dropdown
      const headerLangSelect = document.getElementById('langSelect');
      if (headerLangSelect && this.app.uiHandler && typeof this.app.uiHandler.setupLanguageSwitcher === 'function') {
        this.app.uiHandler.setupLanguageSwitcher();
      }
      // Populate settings page Interface Language dropdown
      const settingsLangSelect = document.querySelector('.main-content #langSelect');
      if (settingsLangSelect && this.app.uiHandler.supportedLangs) {
        settingsLangSelect.innerHTML = '';
        this.app.uiHandler.supportedLangs.forEach(lang => {
          const opt = document.createElement('option'); opt.value = lang.code; opt.textContent = lang.label;
          settingsLangSelect.appendChild(opt);
        });
      }
      // Populate Conversation Language dropdown options
      const convSelect = document.getElementById('conversationLangSelectSettings');
      if (convSelect && this.app.uiHandler.supportedLangs) {
        convSelect.innerHTML = '';
        this.app.uiHandler.supportedLangs.forEach(lang => {
          const opt = document.createElement('option'); opt.value = lang.code; opt.textContent = lang.label;
          convSelect.appendChild(opt);
        });
      }
      const url = `${this.apiHandler.baseURL}/api/settings`;
      const settings = await this.apiHandler.callApi(url, { method: 'GET' });

      // Theme
      const themeSelect = document.getElementById('themeSelect');
      if (themeSelect && settings.theme) themeSelect.value = settings.theme;

      // Interface Language (settings dropdown)
      if (settingsLangSelect && settings.language) settingsLangSelect.value = settings.language;

      // Conversation Language (settings dropdown)
      if (convSelect && settings.notifications && settings.notifications.conversationLanguage) {
        convSelect.value = settings.notifications.conversationLanguage;
      }

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
    // Immediate theme change on selection in Settings
    const themeSelectEl = document.getElementById('themeSelect');
    if (themeSelectEl) {
      themeSelectEl.addEventListener('change', (e) => {
        const theme = e.target.value;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        if (this.app.ui) {
          this.app.ui.theme = theme;
          this.app.ui.updateThemeIcon();
        }
      });
    }
    const saveBtn = document.getElementById('saveSettingsButton');
    if (saveBtn) {
      // Immediate language change on selection
      const langSelectEl = document.querySelector('.main-content #langSelect');
      if (langSelectEl) {
        langSelectEl.addEventListener('change', (e) => {
          const newLang = e.target.value;
          if (this.app && this.app.handleLanguageChange) {
            this.app.handleLanguageChange(newLang);
          }
        });
      }
      const convSelect = document.getElementById('conversationLangSelectSettings');
      if (convSelect) {
        convSelect.addEventListener('change', (e) => {
          this.app.applyConversationTranslation(e.target.value);
        });
      }
      saveBtn.addEventListener('click', async () => {
        const themeSelect = document.getElementById('themeSelect');
        const languageSelect = document.querySelector('.main-content #langSelect');
        const conversationSelect = convSelect;
        const audioSelect = document.getElementById('audioInputSelect');

        const theme = themeSelect ? themeSelect.value : null;
        const language = languageSelect ? languageSelect.value : null;
        const notifications = {};
        if (audioSelect) notifications.audioInputDevice = audioSelect.value;
        if (conversationSelect) notifications.conversationLanguage = conversationSelect.value;

        try {
          const url = `${this.apiHandler.baseURL}/api/settings`;
          await this.apiHandler.callApi(url, {
            method: 'PATCH',
            body: JSON.stringify({ theme, language, notifications })
          });
          // Apply theme change immediately
          if (theme) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            if (this.app.ui) {
              this.app.ui.theme = theme;
              this.app.ui.updateThemeIcon();
            }
          }
          // Apply language change immediately
          if (language && this.app.handleLanguageChange) {
            this.app.handleLanguageChange(language);
          }
          // Apply conversation language change and persist locally
          if (conversationSelect && this.app.transcriptionHandler) {
            this.app.transcriptionHandler.applyTranslation(conversationSelect.value);
            localStorage.setItem('conversationLanguage', conversationSelect.value);
          }
          alert('Settings updated successfully');
        } catch (error) {
          console.error('Error saving settings:', error);
          alert('Failed to save settings');
        }
      });
    }
  }
} 