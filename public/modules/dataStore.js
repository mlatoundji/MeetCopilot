/**
 * Gère le stockage et la récupération des données localement et à distance.
 * Fournit une couche d'abstraction pour le stockage des données, qu'il s'agisse
 * du localStorage, IndexedDB ou Supabase.
 */
export class DataStore {
  constructor(apiHandler = null) {
    this.apiHandler = apiHandler;
    this.localStoragePrefix = 'meetcopilot_';
  }

  /**
   * Définit l'instance API Handler
   * @param {Object} apiHandler - L'instance d'APIHandler
   */
  setApiHandler(apiHandler) {
    this.apiHandler = apiHandler;
  }

  /**
   * Sauvegarde des données dans le localStorage
   * @param {string} key - La clé sous laquelle stocker les données
   * @param {any} data - Les données à stocker
   * @returns {boolean} - Succès ou échec de la sauvegarde
   */
  saveToLocalStorage(key, data) {
    try {
      const prefixedKey = `${this.localStoragePrefix}${key}`;
      const serializedData = JSON.stringify(data);
      localStorage.setItem(prefixedKey, serializedData);
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  }

  /**
   * Récupère des données du localStorage
   * @param {string} key - La clé des données à récupérer
   * @returns {any|null} - Les données récupérées ou null en cas d'erreur
   */
  getFromLocalStorage(key) {
    try {
      const prefixedKey = `${this.localStoragePrefix}${key}`;
      const serializedData = localStorage.getItem(prefixedKey);
      
      if (!serializedData) return null;
      
      return JSON.parse(serializedData);
    } catch (error) {
      console.error('Error retrieving from localStorage:', error);
      return null;
    }
  }

  /**
   * Supprime des données du localStorage
   * @param {string} key - La clé des données à supprimer
   * @returns {boolean} - Succès ou échec de la suppression
   */
  removeFromLocalStorage(key) {
    try {
      const prefixedKey = `${this.localStoragePrefix}${key}`;
      localStorage.removeItem(prefixedKey);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  }

  /**
   * Sauvegarde des données de réunion
   * @param {Object} meetingData - Les données de la réunion à sauvegarder
   * @param {string} saveMethod - La méthode de sauvegarde (local ou supabase)
   * @returns {Promise<Object>} - Résultat de la sauvegarde
   */
  async saveMeetingData(meetingData, saveMethod = 'local') {
    try {
      if (saveMethod === 'local') {
        // Générer un ID unique si non fourni
        const meetingId = meetingData.id || Date.now().toString();
        meetingData.id = meetingId;
        
        // Sauvegarder dans le localStorage
        const meetings = this.getFromLocalStorage('meetings') || [];
        const existingIndex = meetings.findIndex(m => m.id === meetingId);
        
        if (existingIndex >= 0) {
          meetings[existingIndex] = meetingData;
        } else {
          meetings.push(meetingData);
        }
        
        this.saveToLocalStorage('meetings', meetings);
        return { success: true, id: meetingId, message: 'Meeting saved locally' };
      } else if (saveMethod === 'supabase' && this.apiHandler) {
        // Sauvegarder via l'API
        return await this.apiHandler.saveMeeting(meetingData, 'supabase');
      } else {
        throw new Error('Invalid save method or missing API handler');
      }
    } catch (error) {
      console.error('Error saving meeting data:', error);
      return { success: false, error: error.message || 'Failed to save meeting data' };
    }
  }

  /**
   * Récupère les données d'une réunion
   * @param {string} meetingId - L'identifiant de la réunion
   * @param {string} source - La source (local ou supabase)
   * @returns {Promise<Object>} - Les données de la réunion
   */
  async getMeetingData(meetingId, source = 'local') {
    try {
      if (source === 'local') {
        const meetings = this.getFromLocalStorage('meetings') || [];
        const meeting = meetings.find(m => m.id === meetingId);
        
        if (!meeting) {
          return { success: false, error: 'Meeting not found' };
        }
        
        return { success: true, data: meeting };
      } else if (source === 'supabase' && this.apiHandler) {
        // Récupérer via l'API
        return await this.apiHandler.getMeeting(meetingId);
      } else {
        throw new Error('Invalid source or missing API handler');
      }
    } catch (error) {
      console.error('Error retrieving meeting data:', error);
      return { success: false, error: error.message || 'Failed to retrieve meeting data' };
    }
  }

  /**
   * Récupère la liste des réunions
   * @param {string} source - La source (local ou supabase)
   * @returns {Promise<Object>} - La liste des réunions
   */
  async getMeetingsList(source = 'local') {
    try {
      if (source === 'local') {
        const meetings = this.getFromLocalStorage('meetings') || [];
        return { 
          success: true, 
          data: meetings
        };
      } else if (source === 'supabase' && this.apiHandler) {
        // Récupérer via l'API
        return await this.apiHandler.getMeetings();
      } else {
        throw new Error('Invalid source or missing API handler');
      }
    } catch (error) {
      console.error('Error retrieving meetings list:', error);
      return { success: false, error: error.message || 'Failed to retrieve meetings list' };
    }
  }

  /**
   * Supprime les données d'une réunion
   * @param {string} meetingId - L'identifiant de la réunion
   * @param {string} source - La source (local ou supabase)
   * @returns {Promise<Object>} - Résultat de la suppression
   */
  async deleteMeetingData(meetingId, source = 'local') {
    try {
      if (source === 'local') {
        const meetings = this.getFromLocalStorage('meetings') || [];
        const updatedMeetings = meetings.filter(m => m.id !== meetingId);
        
        if (meetings.length === updatedMeetings.length) {
          return { success: false, error: 'Meeting not found' };
        }
        
        this.saveToLocalStorage('meetings', updatedMeetings);
        return { success: true, message: 'Meeting deleted successfully' };
      } else if (source === 'supabase' && this.apiHandler) {
        // Supprimer via l'API
        const url = `${this.apiHandler.baseURL}/api/meetings/${meetingId}`;
        return await this.apiHandler.callApi(url, { method: 'DELETE' });
      } else {
        throw new Error('Invalid source or missing API handler');
      }
    } catch (error) {
      console.error('Error deleting meeting data:', error);
      return { success: false, error: error.message || 'Failed to delete meeting data' };
    }
  }
} 