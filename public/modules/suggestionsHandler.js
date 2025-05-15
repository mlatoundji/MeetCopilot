import { callApi } from '../utils.js';

/**
 * Handles generating suggestions based on the context of a conversation.
 */

export class SuggestionsHandler {
  constructor(suggestionsApiUrlOrApiHandler) {
    if (typeof suggestionsApiUrlOrApiHandler === 'string') {
      this.suggestionsApiUrl = suggestionsApiUrlOrApiHandler;
      this.apiHandler = null;
    } else {
      this.apiHandler = suggestionsApiUrlOrApiHandler;
      this.suggestionsApiUrl = null;
    }
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
      return response.suggestions || 'No suggestions found';
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return 'Error generating suggestions';
    }
  }
}
