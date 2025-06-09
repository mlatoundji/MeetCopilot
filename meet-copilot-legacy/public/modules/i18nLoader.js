export class I18nLoader {
  constructor() {
    this.translations = {};
    this.currentLang = null;
  }

  /**
   * Charge le fichier de langue depuis resources/i18n/<lang>.json
   * @param {string} langCode
   * @returns {Promise<Object>} les traductions
   */
  async load(langCode) {
    if (this.currentLang === langCode && this.translations[langCode]) {
      return this.translations[langCode];
    }
    const url = `/resources/i18n/${langCode}.json`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Failed to load locale: ${langCode}`);
      const data = await resp.json();
      this.translations[langCode] = data;
      this.currentLang = langCode;
      return data;
    } catch (err) {
      console.error('I18nLoader.load error:', err);
      return {};
    }
  }

  /**
   * Récupère une clé de traduction
   * @param {string} key
   * @param {string} [langCode]
   * @returns {string}
   */
  get(key, langCode) {
    const lang = langCode || this.currentLang;
    const dict = this.translations[lang] || {};
    return dict[key] || key;
  }
} 