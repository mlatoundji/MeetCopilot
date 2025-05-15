import { callApi } from '../../utils.js';

export class HomePageHistory {
    constructor(app) {
        this.app = app;
        this.meetingsApiUrl = app.MEETINGS_API_URL;
        this.meetings = [];
    }

    async init() {
        try {
            console.log("Chargement de l'historique des réunions...");
            
            // Utiliser l'API directement pour garantir l'obtention des données
            const response = await fetch('http://localhost:3000/api/meetings?saveMethod=local');
            const result = await response.json();
            console.log("Résultat de l'API pour l'historique:", result);
            
            if (result.success && Array.isArray(result.data)) {
                this.meetings = result.data;
                console.log(`${this.meetings.length} réunions chargées dans l'historique`);
            } else {
                console.error("Erreur lors du chargement des réunions:", result.error || "Format de réponse invalide");
            }
        } catch (error) {
            console.error("Erreur lors de l'initialisation de l'historique:", error);
        }
    }

    render() {
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) {
            console.error("Élément .main-content non trouvé");
            return;
        }

        // Vider le contenu existant
        mainContent.innerHTML = '';

        // Si aucune réunion n'est disponible
        if (!this.meetings || this.meetings.length === 0) {
            mainContent.innerHTML = `
                <div class="no-meetings-message">
                    <h2>Aucune réunion trouvée</h2>
                    <p>Vous n'avez pas encore de réunions enregistrées.</p>
                </div>
            `;
            return;
        }

        // Créer un conteneur pour les cartes de réunion
        const meetingsContainer = document.createElement('div');
        meetingsContainer.className = 'meetings-list';
        
        // Ajouter les styles CSS pour les cartes directement dans le head
        this.addCardStyles();

        // Pour chaque réunion, créer une carte
        this.meetings.forEach(meeting => {
            const card = this.createMeetingCard(meeting);
            meetingsContainer.appendChild(card);
        });

        mainContent.appendChild(meetingsContainer);
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
            .meetings-list {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 20px;
                padding: 20px;
            }
            
            .meeting-card {
                background-color: #fff;
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                transition: transform 0.3s ease, box-shadow 0.3s ease;
                overflow: hidden;
                cursor: pointer;
            }
            
            .meeting-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
            }
            
            .meeting-card-header {
                background-color: #2196F3;
                color: white;
                padding: 15px;
            }
            
            .meeting-card-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
            }
            
            .meeting-card-body {
                padding: 15px;
            }
            
            .meeting-date, .meeting-duration, .meeting-summary {
                margin-bottom: 10px;
            }
            
            .meeting-date, .meeting-duration {
                font-size: 0.9em;
                color: #607D8B;
            }
            
            .meeting-summary {
                margin-top: 15px;
                font-size: 0.95em;
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            
            .meeting-footer {
                padding: 10px 15px;
                background-color: #f5f5f5;
                color: #757575;
                font-size: 0.85em;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .meeting-type {
                display: inline-block;
                padding: 3px 8px;
                border-radius: 4px;
                background-color: #e3f2fd;
                color: #2196F3;
            }
            
            .no-meetings-message {
                text-align: center;
                padding: 50px;
                color: #757575;
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
        if (meeting.summaries && meeting.summaries.length > 0) {
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
} 