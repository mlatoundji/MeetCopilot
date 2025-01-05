import { callApi } from '../utils.js';

/**
 * Handles sending audio data for transcription and receiving the results.
 */

export class ConversationContextHandler {
    constructor(summaryApiUrl) {
        this.conversationContextText = "";
        this.conversationContextHeaderText = "";
        this.conversationContextSummariesText = "";
        this.conversationContextDialogsText = "";
        this.conversationContextSummaries = [];
        this.conversationContextDialogs = [];
        this.lastSummaryTime = Date.now();
        this.summaryIntervalMinutes = 5;
        this.summaryInterval = this.summaryIntervalMinutes * 60 * 1000;
        this.conversationContextMeetingInfosText = "";
        this.summaryApiUrl = summaryApiUrl;

        this.conversationContextDialogsIndexStart = 0;

        this.defaultLang = "fr";
  
        this.supportedLangs = [
          { code: "fr", label: "Français" },
          { code: "en", label: "English" },
        ];
    }


    async maybeGenerateSummary() {
        const now = Date.now();
        if ((now - this.lastSummaryTime) >= this.summaryInterval) {
        
        lastSummaryTime = now;
        const summary = await this.generateSummary(conversationContext);
    
            if(summary != null){
        
                this.conversationContextSummaries.push({text: summary, time: now});
            }
            return summary;
        }
    
        return null;
    }

    async updateConversationContext() {

        this.conversationContextHeaderText = "== Contexte de la conversation ==\n";
    
        let lastSummariesCount = this.conversationContextSummaries.length;
        const res = await this.maybeGenerateSummary();
    
        if(this.conversationContextSummaries.length > 0 && res != null){
            this.conversationContextSummariesText =  "== Résumé de chaque quart heure précédent ==\n"
            this.conversationContextSummariesText += this.conversationContextSummaries.map((key, index) => `Résumé #${index+1} (Tranche ${0+this.summaryIntervalMinutes*index}-${this.summaryIntervalMinutes+this.summaryIntervalMinutes*index}min) : ${key.text}`).join("\n");
            this.conversationContextSummariesText += "\n";
        }
    
        if(this.conversationContextSummaries.length > 0 && lastSummariesCount < this.conversationContextSummaries.length && res != null){
            this.conversationContextDialogsIndexStart = this.conversationContextSummaries.length - 3;
        }
    
        this.conversationContextDialogsText = "== Dernières phrases de la conversation : ==\n";
        this.conversationContextDialogsText += this.conversationContextDialogs.map((key, index) => `[${key.speaker}] ${key.text}`).slice(this.conversationContextDialogsIndexStart, this.conversationContextDialogs.length).join("\n");
        
        this.conversationContextText = `
        ${this.conversationContextHeaderText}
        ${this.conversationContextSummariesText} 
        ${this.conversationContextDialogsText}
        `;
    }

    async generateSummary(context) {
        try {
          const response = await callApi(this.summaryApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context }),
          });
          return response.summary || 'No summary generated';
        } catch (error) {
          console.error('Error generating summary:', error);
          return null;
        }
    }
}
