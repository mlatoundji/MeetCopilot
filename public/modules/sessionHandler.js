import { AudioCapture } from './audioCapture.js';
import { TranscriptionHandler } from './transcriptionHandler.js';
import { SuggestionsHandler } from './suggestionsHandler.js';
import { ConversationContextHandler } from './conversationContextHandler.js';
import { ChatbotHandler } from './chatbotHandler.js';
import { DataStore } from './dataStore.js';
import { APIHandler } from './apiHandler.js';

/**
 * Centralizes session-related handlers and resources.
 */
export class SessionHandler {
  constructor(app) {
    this.app = app;
    this.apiHandler = app.apiHandler || new APIHandler();
    this.dataStore = new DataStore(this.apiHandler);
    this.audioCapture = app.audioCapture || new AudioCapture();
    this.transcriptionHandler = new TranscriptionHandler(this.apiHandler);
    this.suggestionsHandler = new SuggestionsHandler(this.apiHandler);
    this.conversationContextHandler = new ConversationContextHandler(this.apiHandler);
    this.chatbotHandler = new ChatbotHandler(this.apiHandler, this.conversationContextHandler);
    this.sessionId = null;
  }

  /**
   * Called after creating a session on the backend.
   * @param {{session_id: string, conversation_id: string}} resp
   */
  onSessionCreated(resp) {
    this.sessionId = resp.session_id;
    // Use the server-generated conversation ID
    this.conversationContextHandler.conversationId = resp.conversation_id;
    console.log('Session and conversation set:', this.sessionId, resp.conversation_id);
  }

  /**
   * Creates a session via the API, stores IDs, and configures handlers.
   * @param {string} mode
   * @param {Object} metadata
   * @returns {Promise<Object>} The backend response
   */
  async createSession(mode, metadata) {
    const resp = await this.apiHandler.callApi(
      `${this.apiHandler.baseURL}${this.apiHandler.apiPrefix}/sessions`,
      { method: 'POST', body: JSON.stringify({ mode, metadata }) }
    );
    this.onSessionCreated(resp);
    return resp;
  }

  async resumeSession() {
    const sessionId = localStorage.getItem('currentSessionId');
    const conversationId = localStorage.getItem('currentConversationId');
    if (!sessionId) {
      throw new Error('No session to resume');
    }
    if (conversationId) {
      this.conversationContextHandler.conversationId = conversationId;
      this.onSessionCreated({ session_id: sessionId, conversation_id: conversationId });
    }
    else {
      // Fetch session details (includes conversation_id)
      const sessionResp = await this.apiHandler.callApi(
        `${this.apiHandler.baseURL}${this.apiHandler.apiPrefix}/sessions/${sessionId}`,
        { method: 'GET' }
      );
      const sessData = sessionResp.data || sessionResp;
      this.onSessionCreated({ session_id: sessData.id || sessData.session_id, conversation_id: sessData.last_conversation_id });
    }


    // Fetch conversation memory
    const memResp = await this.apiHandler.callApi(
      `${this.apiHandler.baseURL}${this.apiHandler.apiPrefix}/conversation/${this.conversationContextHandler.conversationId}`,
      { method: 'GET' }
    );
    // Populate conversation context handler with retrieved memory
    const memory = memResp.memory_json || memResp.memory;
    if (memory && Array.isArray(memory.messages)) {
      this.conversationContextHandler.conversationContextDialogs = memory.messages;
      this.conversationContextHandler.startTime = new Date(sessData.start_time).getTime() || this.conversationContextHandler.startTime;
    }
    return memResp;
  }

  /**
   * Mark the current session as completed (save) and clear state
   */
  async completeSession() {
    if (!this.sessionId) {
      throw new Error('No session to complete');
    }
    await this.apiHandler.callApi(
      `${this.apiHandler.baseURL}${this.apiHandler.apiPrefix}/sessions/${this.sessionId}`,
      { method: 'PATCH', body: JSON.stringify({ status: 'completed' }) }
    );
    localStorage.removeItem('currentSessionId');
    this.sessionId = null;
  }

  /**
   * Delete the current session without saving and clear state
   */
  async deleteSession() {
    if (!this.sessionId) {
      throw new Error('No session to delete');
    }
    await this.apiHandler.callApi(
      `${this.apiHandler.baseURL}${this.apiHandler.apiPrefix}/sessions/${this.sessionId}`,
      { method: 'DELETE' }
    );
    localStorage.removeItem('currentSessionId');
    this.sessionId = null;
  }
} 