// Stub CBOR encoding in browser context (actual CBOR only on server)
const cborEncode = () => { throw new Error('CBOR encoding not supported in browser'); };

/**
 * Gère les appels aux différentes API externes.
 * Centralise les appels HTTP et gère les erreurs de manière cohérente.
 */
export class APIHandler {
  constructor() {
    this.headers = { 'Accept': 'application/json' };
    this.apiPrefix = '/api';

    // Determine backend base URL:
    // 1. Use explicit override if provided (e.g. <script>window.BACKEND_BASE_URL='https://localhost:3000'</script>)
    // 2. Else derive from current page protocol and host
    // Read VITE_API_BASE_URL if defined (in Vite environment)
    let viteBase = '';
    try {
      viteBase = import.meta.env.VITE_API_BASE_URL;
    } catch (_e) {}
    this.baseURL = viteBase;
    console.log("VITE_API_BASE_URL", this.baseURL);
    if (!this.baseURL) {
    if (typeof window !== 'undefined' && window.BACKEND_BASE_URL) {
      this.baseURL = window.BACKEND_BASE_URL.replace(/\/$/, '');
    } else if (typeof window !== 'undefined' && window.location && window.location.protocol && window.location.host) {
      console.log("window.location.protocol", window.location.protocol);
      console.log("window.location.host", window.location.host);
      this.baseURL = `${window.location.protocol}//${window.location.host}`;
    } else {
      // fallback for non-browser or unknown context
        this.baseURL = 'http://localhost:3000';
      }
    }

    console.log("baseURL", this.baseURL);
  }

  /**
   * Configure un endpoint d'API
   * @param {string} service - Le service (transcribe, suggestions, summary)
   * @param {string} provider - Le fournisseur (whisper, assemblyai, mistral, openai)
   * @returns {string} L'URL complète de l'endpoint
   */
  getEndpoint(service, provider) {
    return `${this.baseURL}${this.apiPrefix}/${service}/${provider}`;
  }

  /**
   * Effectue un appel à l'API
   * @param {string} url - L'URL complète de l'endpoint
   * @param {Object} options - Les options de fetch (method, headers, body)
   * @returns {Promise<Object>} - La réponse JSON de l'API
   */
  async callApi(url, options) {
    console.log("Calling API", url, options);
    try {
      // Préparer les headers en fonction du type de requête
      let headers = { ...this.headers };
      
      // Si le body est FormData, ne pas définir Content-Type
      // Sinon, ajouter Content-Type: application/json si non spécifié
      if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }
      
      // Fusionner avec les headers spécifiés dans les options
      const mergedOptions = {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {})
        }
      };

      // Attach JWT from localStorage if available
      try {
        const token = localStorage.getItem('jwt');
        if (token) {
          mergedOptions.headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (_e) {
        // localStorage not available or no token
      }

      const response = await fetch(url, mergedOptions);
      
      // Si la réponse n'est pas au format JSON, retourner la réponse brute
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        return { success: true, data: await response.text() };
      }

      const data = await response.json();
      console.log("API call succeeded", data);
      if (!response.ok) {
        console.log("API call failed", data);
        throw new Error(data.error || `HTTP error ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error(`API call to ${url} failed:`, error.message || error);
      throw error;
    }
  }

  /**
   * Envoie une requête pour transcription audio
   * @param {Blob} audioBlob - Les données audio à transcrire
   * @param {string} provider - Le fournisseur (whisper, assemblyai)
   * @param {Object} options - Options de transcription (langue, modèle, etc.)
   * @returns {Promise<Object>} - La transcription
   */
  async transcribeAudio(audioBlob, provider = 'assemblyai', options = {}) {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    
    // Ajouter les options supplémentaires
    Object.entries(options).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const url = this.getEndpoint('transcribe', provider);
    return this.callApi(url, {
      method: 'POST',
      body: formData
    });
  }

  /**
   * Génère des suggestions basées sur le contexte
   * @param {string} context - Le contexte de la conversation
   * @param {string} provider - Le fournisseur (mistral, openai, local)
   * @returns {Promise<Object>} - Les suggestions générées
   */
  async generateSuggestions(context, provider = 'mistral') {
    const url = this.getEndpoint('suggestions', provider);
    return this.callApi(url, {
      method: 'POST',
      body: JSON.stringify({ context })
    });
  }

  /**
   * Génère un résumé basé sur le contexte
   * @param {string} context - Le contexte à résumer
   * @param {string} provider - Le fournisseur (mistral, openai, local)
   * @returns {Promise<Object>} - Le résumé généré
   */
  async generateSummary(context, provider = 'mistral') {
    const url = this.getEndpoint('summary', provider);
    return this.callApi(url, {
      method: 'POST',
      body: JSON.stringify({ context })
    });
  }

  /**
   * Analyse une image Base64 pour description et extraction de texte via une API externe
   * @param {string} imageData - Base64-encoded PNG image
   * @param {string} provider - Le fournisseur (mistral, openai)
   * @returns {Promise<Object>} - L'analyse de l'image
   */
  async analyzeImage(imageData, provider = 'mistral') {
    const url = this.getEndpoint('analyze', provider);
    return this.callApi(url, {
      method: 'POST',
      body: JSON.stringify({ image: imageData })
    });
  }

  /**
   * Sauvegarde les données d'une réunion
   * @param {Object} meetingData - Les données de la réunion
   * @param {string} saveMethod - La méthode de sauvegarde (local, supabase)
   * @returns {Promise<Object>} - Le statut de la sauvegarde
   */
  async saveMeeting(meetingData, saveMethod = 'local') {
    const url = `${this.baseURL}${this.apiPrefix}/meetings`;
    return this.callApi(url, {
      method: 'POST',
      body: JSON.stringify({
        saveMethod,
        meetingData
      })
    });
  }

  /**
   * Récupère les données d'une réunion
   * @param {string} meetingId - L'identifiant de la réunion
   * @returns {Promise<Object>} - Les données de la réunion
   */
  async getMeeting(meetingId) {
    const url = `${this.baseURL}${this.apiPrefix}/meetings/${meetingId}`;
    return this.callApi(url, {
      method: 'GET'
    });
  }

  /**
   * Récupère la liste des réunions
   * @param {string} saveMethod - La méthode de sauvegarde (local, supabase)
   * @returns {Promise<Object>} - La liste des réunions
   */
  async getMeetings(saveMethod = 'local') {
    const url = `${this.baseURL}${this.apiPrefix}/meetings?saveMethod=${encodeURIComponent(saveMethod)}`;
    return this.callApi(url, {
      method: 'GET'
    });
  }

  /**
   * Récupère la liste des sessions
   * @param {string} [status] - Optionally filter by session status
   * @returns {Promise<Object>} - La liste des sessions
   */
  async getSessions(status) {
    const url = `${this.baseURL}${this.apiPrefix}/sessions${status ? `?status=${encodeURIComponent(status)}` : ''}`;
    return this.callApi(url, { method: 'GET' });
  }

  /**
   * Récupère les détails d'une session
   * @param {string} sessionId - L'identifiant de la session
   * @returns {Promise<Object>} - Les données de la session
   */
  async getSession(sessionId) {
    const url = `${this.baseURL}${this.apiPrefix}/sessions/${encodeURIComponent(sessionId)}`;
    return this.callApi(url, { method: 'GET' });
  }

  /**
   * Envoie un delta de conversation (nouveaux messages)
   * @param {string} cid - conversation id
   * @param {Array<{role:string,content:string}>} messages - nouveaux messages
   */
  async sendConversationMessages(cid, messages) {
    const url = `${this.baseURL}${this.apiPrefix}/conversation/${encodeURIComponent(cid)}/messages`;
    return this.callApi(url, {
      method: 'POST',
      body: JSON.stringify({ msg: messages })
    });
  }

  /**
   * Génère des suggestions basées sur le contexte
   * @param {string} cid - conversation id
   * @returns {Promise<Object>} - Les suggestions générées
   */
  async startSuggestionsStreaming(cid) {
    const url = `${this.baseURL}${this.apiPrefix}/suggestions/${encodeURIComponent(cid)}/stream`;
    const eventSource = new EventSource(url);
    eventSource.onmessage = (e) => {
      const data = e.data;
      if (data === '[DONE]') {
        console.log("Streaming done");
        eventSource.close();
      } else if (data.startsWith('ERROR')) {
        console.error('Stream error:', data);
        eventSource.close();
      } else {
        console.log("Streaming data:", data);
      }
    };
    eventSource.onerror = (e) => {
      console.error("Streaming error:", e);
    };
    return eventSource;
  }

  /**
   * Envoie un delta de conversation au format CBOR (binary)
   * @param {string} cid - conversation id
   * @param {Array<{role:string,content:string}>} messages - nouveaux messages
   */
  async sendConversationMessagesCbor(cid, messages) {
    const url = `${this.baseURL}${this.apiPrefix}/conversation/${encodeURIComponent(cid)}/messages`;
    const payload = cborEncode({ msg: messages });
    // Prepare headers with Authorization if available
    const headers = { 'Content-Type': 'application/cbor' };
    try {
      const token = localStorage.getItem('jwt');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch (_e) {}
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: payload
    });
    if (!response.ok) {
      const text = await response.text().catch(() => null);
      throw new Error(text || `HTTP error ${response.status}`);
    }
    return response.json();
  }

  /**
   * Send a message to the chatbot, with optional file attachments
   * @param {string} question - The user's question
   * @param {File[]} [attachments] - Optional array of File objects to upload
   * @param {string} model - The model to use for the chatbot
   * @param {string} contextSnippet - The context snippet to use for the chatbot
   * @param {string} sessionId - The session ID to use for the chatbot
   * @returns {Promise<Object>} - The chatbot response
   */
  async sendChatbotMessage(question, attachments = [], model, contextSnippet, sessionId) {
    const url = `${this.baseURL}${this.apiPrefix}/chatbot/message`;
    // If attachments are present, use multipart/form-data
    if (attachments.length > 0) {
      const formData = new FormData();
      formData.append('question', question);
      if (model) formData.append('model', model);
      if (contextSnippet) formData.append('contextSnippet', contextSnippet);
      formData.append('sessionId', sessionId);
      attachments.forEach((file) => formData.append('attachments', file));
      return this.callApi(url, {
        method: 'POST',
        body: formData,
      });
    }
    // Else, send JSON
    return this.callApi(url, {
      method: 'POST',
      body: JSON.stringify({ question, model, contextSnippet, sessionId }),
    });
  }

  /**
   * Stream a message to the chatbot, with optional file attachments
   * @param {string} question - The user's question
   * @param {File[]} [attachments] - Optional array of File objects to upload
   * @returns {Promise<Object>} - The chatbot response
   */
  async streamChatbotMessage(question, attachments = []) {
    const url = `${this.baseURL}${this.apiPrefix}/chatbot/message/stream?question=${encodeURIComponent(question)}`;
    const eventSource = new EventSource(url);
    eventSource.onmessage = (e) => {
      const data = e.data;
      if (data === '[DONE]') {
        eventSource.close();
      } else {
        const parsedData = JSON.parse(data);
        console.log("Streaming data:", parsedData);
      }
    };
    return eventSource;
  }

  /**
   * Fetch chat history for a given session ID
   * @param {string} sessionId
   * @returns {Promise<Object>} - { messages: [...] }
   */
  async getChatbotHistory(sessionId) {
    const url = `${this.baseURL}${this.apiPrefix}/chatbot/history/${encodeURIComponent(sessionId)}`;
    return this.callApi(url, { method: 'GET' });
  }

  /**
   * Save a chat message to history for a given session ID
   * @param {string} sessionId
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - message content
   * @returns {Promise<Object>}
   */
  async saveChatbotHistory(sessionId, role, content) {
    const url = `${this.baseURL}${this.apiPrefix}/chatbot/history/${encodeURIComponent(sessionId)}`;
    return this.callApi(url, {
      method: 'POST',
      body: JSON.stringify({ role, content })
    });
  }

  /**
   * Clear chat session (delete history and attachments)
   * @param {string} sessionId
   * @returns {Promise<Object>}
   */
  async clearChatbotSession(sessionId) {
    const url = `${this.baseURL}${this.apiPrefix}/chatbot/session/${encodeURIComponent(sessionId)}`;
    return this.callApi(url, { method: 'DELETE' });
  }
} 

