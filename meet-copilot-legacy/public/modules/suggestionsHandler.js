import { callApi } from '../utils.js';

/**
 * Handles generating suggestions based on the context of a conversation.
 */

export class SuggestionsHandler {
  constructor(apiHandler) {
    this.apiHandler = apiHandler;
    this.suggestionsApiUrl = this.apiHandler.getEndpoint('suggestions', 'mistral') || "http://localhost:3000/api/suggestions/mistral";
    this.eventSource = null;
    this.suggestionsMessage = '';
    this.language = 'fr';
  }

  applyTranslation(lang) {
    this.language = lang;
  }

  /**
   * Generates suggestions from the conversation context.
   * @param {string} context - The conversation context.
   * @returns {Promise<string>} - The generated suggestions.
   */
  async generateSuggestions(context) {
    try {
      let response;
      if (this.apiHandler) {
        response = await this.apiHandler.generateSuggestions(context, 'mistral');
      } else {
        response = await callApi(this.suggestionsApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context }),
        });
      }
      this.suggestionsMessage = response.suggestions || 'No suggestions found';
      return this.suggestionsMessage;
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return 'Error generating suggestions';
    }
  }

  async startSuggestionsStreaming(cid) {
    try {
      const eventSource = await this.apiHandler.startSuggestionsStreaming(cid, this.language);
      this.eventSource = eventSource;
      return this.eventSource;
    } catch (error) {
      console.error('Error starting suggestions streaming:', error);
      return null;
    }
  }
  
}
