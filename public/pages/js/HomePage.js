import { APIHandler } from '../../modules/apiHandler.js';
import { DataStore } from '../../modules/dataStore.js';
import { UIHandler } from '../../modules/uiHandler.js';
import { BackupHandler } from '../../modules/backupHandler.js';
import { HomePageHistory } from './HomePageHistory.js';
import { MeetingDetailsPage } from './MeetingDetailsPage.js';

export class HomePage {
  constructor(app) {
    this.app = app;
    this.apiHandler = app?.apiHandler || new APIHandler();
    this.dataStore = app?.dataStore || new DataStore(this.apiHandler);
    this.uiHandler = app?.uiHandler || new UIHandler();
    this.backupHandler = app?.backupHandler || new BackupHandler(app);

    this.meetings = [];
    this.filteredMeetings = [];
    this.currentMeetingDetails = null;
    this.infoModal = null;

    this.homePageHistory = new HomePageHistory(this.app);
  }

  async render() {
    await this.loadSavedMeetings();
    this.initializeElements();
    this.bindEvents();
    this.displayMeetings();
    await this.loadDashboardFragment();
  }

  async loadFragment() {
    const response = await fetch('pages/html/home.html');
    const html = await response.text();
    const main = document.querySelector('.main-content');
    if (main) {
      main.innerHTML = html;
    }
  }

  initializeElements() {
    this.dashboardContainer = document.querySelector('.dashboard-grid');
    this.homeControls = document.getElementById('home-controls');
    this.meetingControls = document.getElementById('meeting-controls');
    this.mainContent = document.querySelector('.main-content');

    // Boutons et contrôles
    this.startSessionBtn = document.getElementById('startSessionBtn');
    this.sessionControlBtn = document.getElementById('sessionControlBtn');
    this.closeInfoBtn = document.getElementById('closeInfoBtn');
    this.saveMeetingInfoBtn = document.getElementById('saveMeetingInfoBtn');
    this.searchInput = document.getElementById('searchMeetings');
    
    // Conteneurs
    this.meetingsContainer = document.getElementById('meetingsContainer');
    this.meetingInfoContainer = document.getElementById('meetingInfoContainer');
    this.meetingInfoTitle = document.getElementById('meetingInfoTitle');
    this.meetingInfoDate = document.getElementById('meetingInfoDate');
    this.meetingInfoTranscription = document.getElementById('meetingInfoTranscription');
    this.meetingInfoSuggestions = document.getElementById('meetingInfoSuggestions');
    
    // Boîtes de dialogue/modales
    this.sessionModal = document.getElementById('sessionModal');
    this.meetingTitleInput = document.getElementById('meetingTitleInput');
    
    // Activer la sidebar principale si elle était cachée
    const mainSidebar = document.querySelector('.sidebar');
    if (mainSidebar) mainSidebar.style.display = 'block';
    
    // Cacher la sidebar de réunion si elle était visible
    const meetingSidebar = document.querySelector('.meeting-sidebar');
    if (meetingSidebar) meetingSidebar.style.display = 'none';
  }

  bindEvents() {
    // Listen for hash changes to handle meeting details navigation
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/meeting/')) {
        const meetingId = hash.replace('#/meeting/', '');
        this.showMeetingDetails(meetingId);
      }
    });

    // Contrôles de session
    if (this.startSessionBtn) {
      this.startSessionBtn.addEventListener('click', () => this.handleSessionControl());
    }
    
    if (this.sessionControlBtn) {
      this.sessionControlBtn.addEventListener('click', () => this.handleStartSession());
    }
    
    // Contrôles d'information de réunion
    if (this.closeInfoBtn) {
      this.closeInfoBtn.addEventListener('click', () => this.handleCloseMeetingInfos());
    }
    
    if (this.saveMeetingInfoBtn) {
      this.saveMeetingInfoBtn.addEventListener('click', () => this.handleSaveMeetingInfos());
    }
    
    // Recherche de réunion
    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => this.searchMeetings());
    }
  }

  async loadSavedMeetings() {
    try {
      // Charger les réunions du stockage local
      const result = await this.dataStore.getMeetingsList('local');
      this.meetings = result.success ? result.data : [];
      this.filteredMeetings = [...this.meetings];
      
      // Si nous avons une API, essayer de charger depuis Supabase également
      if (this.apiHandler) {
        const remoteMeetings = await this.backupHandler.fetchMeetings('local');
        if (remoteMeetings && remoteMeetings.length > 0) {
          // Fusionner avec les réunions locales en évitant les doublons
          const localIds = this.meetings.map(m => m.id);
          const uniqueRemoteMeetings = remoteMeetings.filter(rm => !localIds.includes(rm.id));
          
          this.meetings = [...this.meetings, ...uniqueRemoteMeetings];
          this.filteredMeetings = [...this.meetings];
        }
      }
      
      // Trier par date, les plus récentes en premier
      this.meetings.sort((a, b) => {
        const dateA = a.metadata?.startTime || 0;
        const dateB = b.metadata?.startTime || 0;
        return dateB - dateA;
      });
      
      this.filteredMeetings = [...this.meetings];
    } catch (error) {
      console.error('Error loading saved meetings:', error);
    }
  }

  displayMeetings() {
    if (!this.meetingsContainer) return;
    
    // Vider le conteneur
    this.meetingsContainer.innerHTML = '';
    
    if (this.filteredMeetings.length === 0) {
      this.meetingsContainer.innerHTML = '<div class="no-meetings">Aucune réunion trouvée.</div>';
      return;
    }
    
    // Créer une carte pour chaque réunion
    this.filteredMeetings.forEach(meeting => {
      const meetingCard = this.createMeetingCard(meeting);
      this.meetingsContainer.appendChild(meetingCard);
    });
  }

  createMeetingCard(meeting) {
    const card = document.createElement('div');
    card.className = 'meeting-card';
    card.dataset.id = meeting.id;
    
    // Formater la date
    const date = meeting.metadata?.startTime ? new Date(meeting.metadata.startTime) : new Date();
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    
    // Créer le contenu de la carte
    card.innerHTML = `
      <div class="meeting-card-content">
        <h3 class="meeting-card-title">${meeting.title || 'Sans titre'}</h3>
        <div class="meeting-card-date">${formattedDate}</div>
        <div class="meeting-card-summary">${this.getSummaryPreview(meeting)}</div>
      </div>
      <div class="meeting-card-actions">
        <button class="view-meeting-btn" title="Voir les détails">👁️</button>
        <button class="delete-meeting-btn" title="Supprimer">🗑️</button>
      </div>
    `;
    
    // Ajouter des écouteurs d'événements
    card.querySelector('.view-meeting-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.showMeetingDetails(meeting);
    });
    
    card.querySelector('.delete-meeting-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteMeeting(meeting.id);
    });
    
    // Ouvrir les détails au clic sur la carte
    card.addEventListener('click', () => {
      this.showMeetingDetails(meeting);
    });
    
    return card;
  }

  getSummaryPreview(meeting) {
    // Utiliser le résumé s'il existe, sinon extraire du texte de la transcription
    if (meeting.summaries && meeting.summaries.length > 0) {
      return meeting.summaries[0].text.substr(0, 100) + '...';
    } else if (meeting.dialogs && meeting.dialogs.length > 0) {
      // Construire une transcription à partir des dialogues
      const transcription = meeting.dialogs.map(dialog => dialog.text).join(' ');
      return transcription.substr(0, 100) + '...';
    } else {
      return 'Aucun contenu disponible';
    }
  }

  showMeetingDetails(meeting) {
    this.currentMeetingDetails = meeting;
    
    // Mettre à jour les éléments d'information
    if (this.meetingInfoTitle) {
      this.meetingInfoTitle.value = meeting.title || '';
    }
    
    if (this.meetingInfoDate && meeting.metadata?.startTime) {
      const date = new Date(meeting.metadata.startTime);
      this.meetingInfoDate.textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
    
    if (this.meetingInfoTranscription) {
      if (meeting.dialogs && meeting.dialogs.length > 0) {
        // Construire une transcription à partir des dialogues
        const transcription = meeting.dialogs.map(dialog => 
          `[${dialog.speaker}]: ${dialog.text}`
        ).join('\n');
        this.meetingInfoTranscription.textContent = transcription;
      } else {
        this.meetingInfoTranscription.textContent = 'Aucune transcription disponible';
      }
    }
    
    if (this.meetingInfoSuggestions) {
      this.meetingInfoSuggestions.innerHTML = '';
      if (meeting.suggestions && meeting.suggestions.length > 0) {
        meeting.suggestions.forEach(suggestion => {
          const suggestionEl = document.createElement('div');
          suggestionEl.className = 'suggestion-item';
          suggestionEl.textContent = suggestion.text || suggestion;
          this.meetingInfoSuggestions.appendChild(suggestionEl);
        });
      } else {
        this.meetingInfoSuggestions.textContent = 'Aucune suggestion disponible';
      }
    }
    
    // Afficher le conteneur
    if (this.meetingInfoContainer) {
      this.meetingInfoContainer.style.display = 'block';
    }
  }

  searchMeetings() {
    if (!this.searchInput) return;
    
    const searchTerm = this.searchInput.value.toLowerCase();
    
    if (!searchTerm) {
      this.filteredMeetings = [...this.meetings];
    } else {
      this.filteredMeetings = this.meetings.filter(meeting => {
        // Rechercher dans le titre
        if (meeting.title && meeting.title.toLowerCase().includes(searchTerm)) {
          return true;
        }
        
        // Rechercher dans la transcription
        if (meeting.transcription && meeting.transcription.toLowerCase().includes(searchTerm)) {
          return true;
        }
        
        // Rechercher dans les suggestions
        if (meeting.suggestions && meeting.suggestions.some(s => s.toLowerCase().includes(searchTerm))) {
          return true;
        }
        
        return false;
      });
    }
    
    this.displayMeetings();
  }

  async deleteMeeting(meetingId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette réunion ?')) {
      return;
    }
    
    try {
      // Supprimer localement
      await this.dataStore.deleteMeeting(meetingId);
      
      // Supprimer à distance si possible
      if (this.apiHandler) {
        await this.backupHandler.deleteMeeting(meetingId);
      }
      
      // Mettre à jour la liste
      this.meetings = this.meetings.filter(m => m.id !== meetingId);
      this.filteredMeetings = this.filteredMeetings.filter(m => m.id !== meetingId);
      this.displayMeetings();
      
      // Fermer les détails si c'est la réunion actuellement affichée
      if (this.currentMeetingDetails && this.currentMeetingDetails.id === meetingId) {
        this.handleCloseMeetingInfos();
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
      alert('Erreur lors de la suppression de la réunion.');
    }
  }

  handleSessionControl() {
    if (this.sessionModal) {
      this.sessionModal.style.display = 'block';
      if (this.meetingTitleInput) {
        this.meetingTitleInput.focus();
      }
    }
  }

  handleStartSession() {
    if (this.meetingTitleInput) {
      const meetingTitle = this.meetingTitleInput.value.trim();
      if (meetingTitle) {
        // Initialiser les données de réunion
        if (this.app && this.app.backupHandler) {
          this.app.backupHandler.initializeMeeting(meetingTitle);
        }
        
        // Fermer la modale
        if (this.sessionModal) {
          this.sessionModal.style.display = 'none';
        }
        
        // Naviguer vers la page de réunion
        window.location.hash = 'meeting';
      } else {
        alert('Veuillez entrer un titre pour la réunion.');
      }
    }
  }

  handleCloseMeetingInfos() {
    this.currentMeetingDetails = null;
    if (this.meetingInfoContainer) {
      this.meetingInfoContainer.style.display = 'none';
    }
  }

  async handleSaveMeetingInfos() {
    if (!this.currentMeetingDetails || !this.meetingInfoTitle) return;
    
    const newTitle = this.meetingInfoTitle.value.trim();
    if (newTitle === '') {
      alert('Le titre ne peut pas être vide.');
      return;
    }
    
    try {
      // Mettre à jour localement
      this.currentMeetingDetails.title = newTitle;
      await this.dataStore.saveMeeting(this.currentMeetingDetails);
      
      // Mettre à jour à distance si possible
      if (this.apiHandler) {
        await this.backupHandler.updateMeeting(this.currentMeetingDetails);
      }
      
      // Mettre à jour l'affichage
      this.displayMeetings();
      alert('Informations de réunion mises à jour avec succès.');
    } catch (error) {
      console.error('Error saving meeting info:', error);
      alert('Erreur lors de la sauvegarde des informations de réunion.');
    }
  }

  async loadHistory() {
    const response = await fetch('pages/html/history.html');
    const html = await response.text();
    if (this.mainContent) this.mainContent.innerHTML = html;
    if (this.homePageHistory) {
      await this.homePageHistory.init();
      this.homePageHistory.render();
    }
    document.body.style.overflow = 'hidden';
  }

  async loadSettings() {
    const response = await fetch('pages/html/settings.html');
    const html = await response.text();
    if (this.mainContent) this.mainContent.innerHTML = html;
    document.body.style.overflow = '';
  }

  async renderRecentMeetingsCards() {
    // Fetch recent meetings from API
    try {
      console.log("Début du chargement des réunions récentes");
      
      // Utiliser l'API directement pour garantir l'obtention des données
      const response = await fetch('http://localhost:3000/api/meetings?saveMethod=local');
      const result = await response.json();
      console.log("Résultat de l'API:", result);
      
      if (!result.success || !Array.isArray(result.data) || result.data.length === 0) {
        // S'assurer que le message Empty reste visible
        const emptyLabel = document.querySelector('.no-recent-meetings');
        console.log("Message Empty conservé visible, aucune réunion trouvée");
        if (emptyLabel) emptyLabel.style.display = '';
        return;
      }

      const meetings = result.data;
      console.log("Nombre de réunions trouvées:", meetings.length);
      
      // Cacher le message Empty
      const emptyLabel = document.querySelector('.no-recent-meetings');
      console.log("Élément Empty trouvé:", !!emptyLabel);
      if (emptyLabel) emptyLabel.style.display = 'none';
      
      const dashboardGrid = document.querySelector('.dashboard-grid');
      const recentMeetingsList = document.querySelector('.recent-meetings-list');
      console.log("Liste des réunions récentes trouvée:", !!recentMeetingsList);
      
      if (!recentMeetingsList) return;
      
      // Supprime tous les éléments existants sauf le message Empty
      while (recentMeetingsList.firstChild) {
        if (recentMeetingsList.firstChild.classList && recentMeetingsList.firstChild.classList.contains('no-recent-meetings')) {
          // Ne pas supprimer l'élément Empty
          recentMeetingsList.firstChild.style.display = 'none';
          break;
        } else {
          recentMeetingsList.removeChild(recentMeetingsList.firstChild);
        }
      }
      
      // Ajouter les cartes de réunion
      meetings.slice(0, 6).forEach((meeting, index) => {
        console.log(`Création de la carte pour la réunion ${index}:`, meeting.title);
        const card = document.createElement('div');
        card.className = 'meeting-card';
        card.innerHTML = `
          <div class="meeting-info">
            <h3 class="meeting-title">${meeting.title || 'Sans titre'}</h3>
            <div class="meeting-meta">
              <span class="meeting-date">${meeting.metadata && meeting.metadata.startTime ? new Date(meeting.metadata.startTime).toLocaleString() : 'XX/XX/XXXX'}</span>
              <span class="meeting-duration">${meeting.metadata && meeting.metadata.duration ? this.formatDuration(meeting.metadata.duration) : '00:00:00'}</span>
              <span class="save-method">${meeting.metadata && meeting.metadata.saveMethod ? (meeting.metadata.saveMethod === 'local' ? 'Local' : 'Cloud') : 'Local'}</span>
            </div>
          </div>
        `;
        card.addEventListener('click', () => {
          window.location.hash = `#/meeting/${meeting.id}`;
        });
        recentMeetingsList.appendChild(card);
      });
      
      console.log("Réunions affichées avec succès:", meetings.length);
      
    } catch (e) {
      console.error("Erreur lors du chargement des réunions:", e);
    }
  }

  formatDuration(duration) {
    if (!duration || isNaN(duration)) return '';
    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
  }

  // Placeholder for upcoming meetings logic
  hideUpcomingEmptyLabelIfItems() {
    const upcomingList = document.querySelector('.upcoming-meetings-list');
    const emptyLabel = upcomingList ? upcomingList.querySelector('.no-upcoming-meetings') : null;
    if (upcomingList && upcomingList.children.length > 1 && emptyLabel) {
      // If there are items besides the empty label, hide the empty label
      emptyLabel.style.display = 'none';
    } else if (emptyLabel) {
      emptyLabel.style.display = '';
    }
  }

  bindSessionStartButton() {
    const btn = document.getElementById('sessionControlButton');
    if (btn) {
      // Remove previous listener if any to avoid duplicates
      btn.replaceWith(btn.cloneNode(true));
      const newBtn = document.getElementById('sessionControlButton');
      if (newBtn) {
        newBtn.addEventListener('click', () => this.app.handleSessionControl());
      }
    }
  }

  async loadDashboardFragment() {
    // Vérifie si le conteneur existe déjà, sinon le créer
    let dashboardContainer = document.getElementById('dashboard-fragment');
    if (!dashboardContainer) {
      dashboardContainer = document.createElement('div');
      dashboardContainer.id = 'dashboard-fragment';
      document.querySelector('.main-content').appendChild(dashboardContainer);
    }

    // Charge le fragment dashboard.html
    const response = await fetch('pages/html/dashboard.html');
    const html = await response.text();
    dashboardContainer.innerHTML = html;
    
    // Lier les boutons
    this.bindSessionStartButton();
    
    // Afficher les réunions récentes
    await this.renderRecentMeetingsCards();
    
    console.log("Dashboard fragment chargé avec succès");
  }
}

export default HomePage; 