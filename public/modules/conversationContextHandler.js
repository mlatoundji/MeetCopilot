import { callApi } from '../utils.js';

/**
 * Handles sending audio data for transcription and receiving the results.
 */

export class ConversationContextHandler {
    constructor(summaryApiUrl) {
        this.conversationContextText = "";
        this.conversationContextHeaderText = "== Contexte de la conversation ==\n";
        this.conversationContextSummariesHeaderText = "== Résumé de chaque quart d'heure précédent ==\n";
        this.conversationContextSummariesText = "";
        this.conversationContextDialogsHeaderText = "== Dernières phrases de la conversation : ==\n";
        this.conversationContextDialogsText = "";
        this.conversationContextSummaries = [];
        this.conversationContextDialogs = [];
        this.lastSummaryTime = Date.now();
        this.summaryIntervalMinutes = 2;
        this.summaryInterval = this.summaryIntervalMinutes * 60 * 1000;

        this.systemLabel = "System";
        this.micLabel = "Mic";
        this.conversationContextMeetingInfosText = "";
        this.summaryApiUrl = summaryApiUrl;

        this.conversationContextDialogsIndexStart = 0;

        this.defaultLang = "fr";
        this.translations = {
            fr: {
              contextHeader: `
              == Contexte de la conversation ==
              Voici une conversation. L'utilisateur discute avec un interlocuteur dans un contexte de réunion.
              Informations sur la réunion : 
              * Utilisateur : [${this.micLabel}]
              * Interlocuteur : [${this.systemLabel}]
              ${this.conversationContextMeetingInfosText}
              Suivez la conversation ci-dessous.
              `,
              summariesHeader: "== Résumé de chaque quart d'heure précédent ==",
              dialogsHeader: "== Dernières phrases de la conversation : ==",
            },
            en: {
              contextHeader: `
              == Conversation context ==
              Here is a conversation. The user is talking to an interlocutor in a meeting context.
              Meeting information:
              * User: [${this.micLabel}]
              * Interlocutor: [${this.systemLabel}]
              ${this.conversationContextMeetingInfosText}
              Follow the conversation below.
              `,
              summariesHeader: "== Summary of each previous quarter hour ==",
              dialogsHeader: "== Last sentences of the conversation: ==",
            },
          };
        
        this.selectedTranslations = this.translations[this.defaultLang];

        this.translateContext(this.defaultLang);
  
    }

    translateContext(lang) {

        this.selectedTranslations = this.translations[lang];
        this.conversationContextHeaderText = this.selectedTranslations.contextHeader + "\n";
        this.conversationContextSummariesHeaderText = this.selectedTranslations.summariesHeader + "\n" 
        this.conversationContextDialogsHeaderText = this.selectedTranslations.dialogsHeader + "\n";
      
      }


    async maybeGenerateSummary() {
        const now = Date.now();
        if ((now - this.lastSummaryTime) >= this.summaryInterval) {
        
            this.lastSummaryTime = now;
        const summary = await this.generateSummary(this.conversationContextText);
    
            if(summary != null){
        
                this.conversationContextSummaries.push({text: summary, time: now});
            }
            return summary;
        }
    
        return null;
    }

    async updateConversationContext() {
    
        let lastSummariesCount = this.conversationContextSummaries.length;
        const res = await this.maybeGenerateSummary();
    
        if(this.conversationContextSummaries.length > 0 && res != null){
            this.conversationContextSummariesText =  this.conversationContextSummariesHeaderText;
            this.conversationContextSummariesText += this.conversationContextSummaries.map((key, index) => `Résumé #${index+1} (Tranche ${0+this.summaryIntervalMinutes*index}-${this.summaryIntervalMinutes+this.summaryIntervalMinutes*index}min) : ${key.text}`).join("\n");
        }
    
        if(this.conversationContextSummaries.length > 0 && lastSummariesCount < this.conversationContextSummaries.length && res != null){
            this.conversationContextDialogsIndexStart = this.conversationContextSummaries.length - 3;
        }
    
        this.conversationContextDialogsText = this.conversationContextDialogs.length > 0 ? this.conversationContextDialogsHeaderText : "";
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
