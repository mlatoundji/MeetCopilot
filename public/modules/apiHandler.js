/**
 * Gère les appels aux différentes API externes.
 * Centralise les appels HTTP et gère les erreurs de manière cohérente.
 */
export class APIHandler {
  constructor() {
    this.headers = {
      'Accept': 'application/json'
    };
    
    // Définir le préfixe de l'API
    this.apiPrefix = '/api';
    
    // Détermination dynamique du backend
    // 1. L'application peut définir explicitement window.BACKEND_BASE_URL avant de charger les scripts.
    // 2. Sinon, si le fichier est servi via http(s) **et** le port vaut 3000, on garde la même origine.
    // 3. Dans les autres cas (par ex. front-end sur Vite :5173 ou file://), on utilise localhost:3000.

    if (typeof window !== 'undefined' && window.BACKEND_BASE_URL) {
      this.baseURL = window.BACKEND_BASE_URL.replace(/\/$/, ''); // remove trailing slash
    } else if (typeof window !== 'undefined' && window.location && window.location.origin.startsWith('http')) {
      const { origin } = window.location;
      const currentPort = new URL(origin).port;
      this.baseURL = (currentPort === '' || currentPort === '3000') ? origin : 'http://localhost:3000';
    } else {
      this.baseURL = 'http://localhost:3000';
    }
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
      
      if (!response.ok) {
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
} 