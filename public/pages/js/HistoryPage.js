import { HomePageHistory } from './HomePageHistory.js';

export class HistoryPage {
    constructor(app) {
        this.app = app;
        this.historyHandler = new HomePageHistory(app);
    }

    async init() {
        console.log("Initialisation de la page History");
        // Charger le template HTML de base si nécessaire
        await this.loadHistoryTemplate();
        
        // Initialiser et afficher l'historique des réunions
        await this.historyHandler.init();
        this.historyHandler.render();
    }

    async loadHistoryTemplate() {
        try {
            // Le contenu HTML est déjà chargé par le Router, 
            // cette méthode est juste au cas où vous auriez besoin 
            // d'ajouter des éléments supplémentaires
            console.log("Template History chargé");
        } catch (error) {
            console.error("Erreur lors du chargement du template History:", error);
        }
    }
}

export default HistoryPage; 