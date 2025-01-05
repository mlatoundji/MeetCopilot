import { callApi } from '../utils.js';

/**
 * Handles generating suggestions based on the context of a conversation.
 */

export class SuggestionsHandler {
  constructor(suggestionsApiUrl) {
    this.suggestionsApiUrl = suggestionsApiUrl;
  }

  /**
   * Generates suggestions from the conversation context.
   * @param {string} context - The conversation context.
   * @returns {Promise<string>} - The generated suggestions.
   */
  async generateSuggestions(context) {
    try {
      const response = await callApi(this.suggestionsApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      });
      return response.suggestions || 'No suggestions found';
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return 'Error generating suggestions';
    }
  }
}
