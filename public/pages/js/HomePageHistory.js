import { callApi } from '../../utils.js';

export class HomePageHistory {
    constructor(app) {
        this.app = app;
        this.meetingsApiUrl = app.MEETINGS_API_URL;
        this.meetings = [];
        this.filteredMeetings = [];
    }

    async init() {
        try {
            console.log("Chargement de l'historique des réunions...");
            
            // Utiliser l'API via callApi pour une meilleure gestion des URLs
            const result = await callApi('/api/meetings', {
                method: 'GET',
                params: { saveMethod: 'local' }
            });
            
            console.log("Résultat de l'API pour l'historique:", result);

            if (result.success && Array.isArray(result.data)) {
                this.meetings = result.data;
                this.filteredMeetings = [...this.meetings];
                console.log(`${this.meetings.length} réunions chargées dans l'historique`);
            } else {
                console.error("Erreur lors du chargement des réunions:", result.error || "Format de réponse invalide");
            }
        } catch (error) {
            console.error("Erreur lors de l'initialisation de l'historique:", error);
        }
        // Bind search events
        this.bindEvents();
    }

    render() {
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) {
            console.error("Élément .main-content non trouvé");
            return;
        }

        // Vider le contenu existant
        mainContent.innerHTML = '';

        // Créer un fragment pour regrouper les éléments
        const fragment = document.createDocumentFragment();

        // Ajouter un titre à la page
        const titleElement = document.createElement('h1');
        titleElement.className = 'page-title';
        titleElement.textContent = 'Historique des réunions';
        fragment.appendChild(titleElement);

        // Créer la barre de recherche
        const searchBar = document.createElement('div');
        searchBar.className = 'search-bar';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'search-input';
        searchInput.placeholder = 'Recherche...';

        const searchButton = document.createElement('button');
        searchButton.className = 'search-button';
        searchButton.textContent = '🔍';

        searchBar.appendChild(searchInput);
        searchBar.appendChild(searchButton);
        fragment.appendChild(searchBar);

        // Si aucune réunion n'est disponible
        if (!this.filteredMeetings || this.filteredMeetings.length === 0) {
            const noMeetingsMessage = document.createElement('div');
            noMeetingsMessage.className = 'no-meetings-message';
            noMeetingsMessage.innerHTML = `
                <h2>Aucune réunion trouvée</h2>
                <p>Vous n'avez pas encore de réunions enregistrées.</p>
            `;
            fragment.appendChild(noMeetingsMessage);
            mainContent.appendChild(fragment);
            return;
        }

        // Créer un conteneur pour les cartes de réunion
        const meetingsContainer = document.createElement('div');
        meetingsContainer.className = 'meetings-list';
        
        // Ajouter les styles CSS pour les cartes directement dans le head
        this.addCardStyles();

        // Render filtered meetings
        this.filteredMeetings.forEach(meeting => {
            const card = this.createMeetingCard(meeting);
            meetingsContainer.appendChild(card);
        });

        fragment.appendChild(meetingsContainer);
        mainContent.appendChild(fragment);
    }

    addCardStyles() {
        // Vérifier si les styles sont déjà ajoutés
        if (document.getElementById('meeting-card-styles')) {
            return;
        }

        // Créer un élément style
        const styleElement = document.createElement('style');
        styleElement.id = 'meeting-card-styles';
        
        // Définir les styles pour les cartes
        styleElement.textContent = `
            .page-title {
                padding: 20px;
                margin: 0;
                color: var(--text-color, #fff);
                font-size: 24px;
                }
        
                .meetings-list {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                     gap: 20px;
                padding: 0 20px 20px 20px;
                width: 100%;
            }
            
            .meeting-card {
                background-color: var(--card-bg-color, #2a2a2a);
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                transition: transform 0.3s ease, box-shadow 0.3s ease;
                overflow: hidden;
                cursor: pointer;
                height: 100%;
                     display: flex;
                     flex-direction: column;
                border: 1px solid var(--border-color, #3d3d3d);
            }
            
            .meeting-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
                border-color: var(--primary-color, #2196F3);
                }
            
            .meeting-card-header {
                background-color: var(--primary-color, #2196F3);
                color: white;
                padding: 15px;
                }
            
            .meeting-card-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .meeting-card-body {
                padding: 15px;
                flex-grow: 1;
                display: flex;
                flex-direction: column;
                color: var(--text-color, #fff);
            }
            
            .meeting-date, .meeting-duration {
                margin-bottom: 10px;
                font-size: 0.9em;
                color: var(--secondary-text-color, #b0b0b0);
            }
            
            .meeting-summary {
                margin-top: 15px;
                font-size: 0.95em;
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
                flex-grow: 1;
            }
            
            .meeting-footer {
                padding: 10px 15px;
                background-color: var(--footer-bg-color, #1f1f1f);
                color: var(--secondary-text-color, #b0b0b0);
                font-size: 0.85em;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-top: 1px solid var(--border-color, #3d3d3d);
                }
            
            .meeting-type {
                display: inline-block;
                padding: 3px 8px;
                border-radius: 4px;
                background-color: var(--tag-bg-color, #1e3a5a);
                color: var(--primary-color, #2196F3);
            }
            
            .meeting-action {
                color: var(--primary-color, #2196F3);
                font-weight: 500;
            }
            
            .no-meetings-message {
                text-align: center;
                padding: 50px;
                color: var(--text-color, #fff);
            }
            
            /* Support pour le thème clair */
            html[data-theme="light"] .meeting-card {
                background-color: #ffffff;
                border-color: #e0e0e0;
            }
            
            html[data-theme="light"] .meeting-card-body {
                color: #333333;
                }
            
            html[data-theme="light"] .meeting-date, 
            html[data-theme="light"] .meeting-duration {
                color: #757575;
            }
            
            html[data-theme="light"] .meeting-footer {
                background-color: #f5f5f5;
                border-color: #e0e0e0;
                }
            
            html[data-theme="light"] .meeting-type {
                background-color: #e3f2fd;
            }
            
            html[data-theme="light"] .no-meetings-message {
                color: #333333;
            }
            
            html[data-theme="light"] .page-title {
                color: #333333;
            }
            
            /* Styles responsifs */
            @media (max-width: 768px) {
                .meetings-list {
                    grid-template-columns: 1fr;
                }
            }
        `;
        
        // Ajouter les styles au head
        document.head.appendChild(styleElement);
                }

    createMeetingCard(meeting) {
        const card = document.createElement('div');
        card.className = 'meeting-card';
        card.setAttribute('data-meeting-id', meeting.id || meeting.metadata?.id);
        
        // Formater la date et la durée
        let dateStr = "Date inconnue";
        let durationStr = "Durée inconnue";
        
        if (meeting.metadata?.startTime) {
            const date = new Date(meeting.metadata.startTime);
            dateStr = date.toLocaleDateString() + ', ' + date.toLocaleTimeString();
        }
        
        if (meeting.metadata?.duration) {
            const duration = meeting.metadata.duration;
            const hours = Math.floor(duration / 3600).toString().padStart(2, '0');
            const minutes = Math.floor((duration % 3600) / 60).toString().padStart(2, '0');
            const seconds = Math.floor(duration % 60).toString().padStart(2, '0');
            durationStr = `${hours}:${minutes}:${seconds}`;
        }
        
        // Obtenir un résumé ou extrait de la transcription
        let summaryText = "Aucun contenu disponible";
        if (meeting.summaries && meeting.summaries.length > 0 && meeting.summaries[0].text) {
            summaryText = meeting.summaries[0].text.substr(0, 150) + '...';
        } else if (meeting.dialogs && meeting.dialogs.length > 0) {
            const transcription = meeting.dialogs.map(dialog => dialog.text).join(' ');
            summaryText = "Points clés : " + transcription.substr(0, 150) + '...';
                }
        
        // Construire le HTML de la carte
        card.innerHTML = `
            <div class="meeting-card-header">
                <h3>${meeting.title || "Réunion sans titre"}</h3>
            </div>
            <div class="meeting-card-body">
                <div class="meeting-date">${dateStr}</div>
                <div class="meeting-duration">Durée: ${durationStr}</div>
                <div class="meeting-summary">${summaryText}</div>
            </div>
            <div class="meeting-footer">
                <div class="meeting-type">${meeting.metadata?.source || "Local"}</div>
                <div class="meeting-action">Voir les détails →</div>
            </div>
        `;
        
        // Ajouter un gestionnaire d'événements pour naviguer vers la page de détails
        card.addEventListener('click', () => this.showMeetingDetails(meeting));
        
        return card;
        }

    // Fonction pour naviguer vers la page de détails de la réunion
    showMeetingDetails(meeting) {
        const meetingId = meeting.id || meeting.metadata?.id;
        if (!meetingId) {
            console.error("Impossible d'afficher les détails: ID de réunion manquant");
            return;
        }
        
        console.log(`Navigation vers la réunion ${meetingId}: ${meeting.title || "Sans titre"}`);
        
        // Utiliser le hash pour la navigation
        window.location.hash = `/meeting/${meetingId}`;
    }

    bindEvents() {
        const searchInput = document.querySelector('.search-input');
        const searchButton = document.querySelector('.search-button');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.handleSearch());
        }
        if (searchButton) {
            searchButton.addEventListener('click', () => this.handleSearch());
        }
    }

    handleSearch() {
        const query = (document.querySelector('.search-input')?.value || '').toLowerCase();
        
        // Calculate new filtered results
        const newFilteredMeetings = !query ? 
            [...this.meetings] : 
            this.meetings.filter(meeting => {
                if (meeting.title?.toLowerCase().includes(query)) return true;
                if (meeting.summaries?.some(s => s.text.toLowerCase().includes(query))) return true;
                if (meeting.dialogs?.some(d => d.text.toLowerCase().includes(query))) return true;
                return false;
            });
        
        // Compare arrays to check if they're different
        const hasChanged = this.filteredMeetings.length !== newFilteredMeetings.length ||
            newFilteredMeetings.some((meeting, index) => {
                const currentMeeting = this.filteredMeetings[index];
                return !currentMeeting || 
                       meeting.id !== currentMeeting.id || 
                       meeting.metadata?.id !== currentMeeting.metadata?.id;
            });
        
        // Only update and render if there's a change
        if (hasChanged) {
            this.filteredMeetings = newFilteredMeetings;
            this.render();
        }
    }
} 