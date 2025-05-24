import { callApi } from '../utils.js';

/**
 * Handles sending audio data for transcription and receiving the results.
 */

export class ConversationContextHandler {
    constructor(summaryApiUrlOrApiHandler) {
        if (typeof summaryApiUrlOrApiHandler === 'string') {
            console.log("Using summary API URL", summaryApiUrlOrApiHandler);
            this.summaryApiUrl = summaryApiUrlOrApiHandler;
            this.apiHandler = null;
        } else {
            console.log("Using API handler", summaryApiUrlOrApiHandler);
            this.apiHandler = summaryApiUrlOrApiHandler;
            this.summaryApiUrl = null;
        }
        
        this.conversationContextText = "";
        this.conversationContextHeaderText = "== Contexte de la conversation ==\n";
        this.conversationContextSummariesHeaderText = "== Résumé de chaque quart d'heure précédent ==\n";
        this.conversationContextSummariesText = "";
        this.conversationContextDialogsHeaderText = "== Dernières phrases de la conversation : ==\n";
        this.conversationContextDialogsText = "";
        this.conversationContextSummaries = [];
        this.conversationContextDialogs = [];
        this.conversationContextSuggestions = [];
        this.lastSummaryTime = Date.now();
        this.summaryIntervalMinutes = 5;
        this.summaryInterval = this.summaryIntervalMinutes * 60 * 1000;

        this.assistantSuggestions = [];

        this.SYSTEM_SOURCE = 'system';
        this.MIC_SOURCE = 'mic';

        this.systemLabel = "Guest";
        this.micLabel = "User";
        this.conversationContextMeetingInfosText = "";

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
  
        const generateId = () => (crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36)+Math.random().toString(36).slice(2)));
        this.conversationId = generateId();
        this.unsentMessages = [];
        console.log("Conversation ID", this.conversationId);
    }

    translateContext(lang) {

        this.selectedTranslations = this.translations[lang];
        this.updateConversationContextHeadersText();   
      }

      updateConversationContextHeadersText() {
        this.conversationContextHeaderText = this.selectedTranslations.contextHeader + "\n";
        this.conversationContextSummariesHeaderText = this.selectedTranslations.summariesHeader + "\n" 
        this.conversationContextDialogsHeaderText = this.selectedTranslations.dialogsHeader + "\n";
      }

      resetConversationContext() {
        this.conversationContextText = "";
        this.conversationContextSummaries = [];
        this.conversationContextDialogs = [];
        this.conversationContextSuggestions = [];
        this.conversationContextDialogsIndexStart = 0;
        this.updateConversationContextHeadersText();
        this.updateConversationContext();
      }

      updateMeetingInfosText(newText) {
        this.conversationContextMeetingInfosText = newText;
        this.translations.fr.contextHeader = `
        == Contexte de la conversation ==
        Voici une conversation. L'utilisateur discute avec un interlocuteur dans un contexte de réunion.
        Informations sur la réunion : 
        * Utilisateur : [${this.micLabel}]
        * Interlocuteur : [${this.systemLabel}]
        ${this.conversationContextMeetingInfosText}
        Suivez la conversation ci-dessous.
        `;
        this.translations.en.contextHeader = `
        == Conversation context ==
        Here is a conversation. The user is talking to an interlocutor in a meeting context.
        Meeting information:
        * User: [${this.micLabel}]
        * Interlocutor: [${this.systemLabel}]
        ${this.conversationContextMeetingInfosText}
        Follow the conversation below.
        `;
    }


    async maybeGenerateSummary() {
        const now = Date.now();
        if ((now - this.lastSummaryTime) >= this.summaryInterval) {
        
            this.lastSummaryTime = now;
            const summary = await this.generateSummary(this.conversationContextText);
    
            if(summary != null){
        
                this.conversationContextSummaries.push({text: summary, time: now, language: this.defaultLang});
            }
            return summary;
        }
    
        return null;
    }

    async updateConversationContext() {

        this.conversationContextDialogsText = "";
        this.conversationContextDialogsText += this.conversationContextDialogs.map((key, index) => `[${key.speaker}] ${key.text}`).slice(this.conversationContextDialogsIndexStart, this.conversationContextDialogs.length).join("\n");
        
        
        this.conversationContextText = `
        ${this.conversationContextHeaderText ? this.conversationContextHeaderText : ""}
        ${this.conversationContextDialogsText ? this.conversationContextDialogsText : ""}
        `;
        console.log("Words count : ", this.conversationContextText.split(" ").length);
        
        if(this.unsentMessages.length > 0 && this.apiHandler){
            let delta;
            try {
                delta = this.unsentMessages.splice(0, this.unsentMessages.length);
                console.log("Sending unsent messages", delta);
                const res = await this.apiHandler.sendConversationMessages(this.conversationId, delta);
                if(res && res.assistant && res.assistant.content){
                    // Display assistant reply in UI (as suggestion area)
                    const assistantText = res.assistant.content;
                    this.assistantSuggestions.push({ speaker: 'Assistant', text: assistantText, time: Date.now(), language: this.defaultLang, source: 'assistant' });
                    // no further recursive push to unsentMessages
                    // update UI transcription
                    if(typeof this.updateUIAfterAssistant === 'function'){
                        this.updateUIAfterAssistant(assistantText);
                    }
                }
            } catch(err){
                console.error('Failed to push conversation delta', err);
                // Requeue messages on failure
                if (delta) this.unsentMessages.unshift(...delta);
            }
        }
    }

    async generateSummary(context) {
        try {
          let start = Date.now();
          let response;
          if (this.apiHandler) {
            response = await this.apiHandler.generateSummary(context, 'mistral');
          } else {
            response = await callApi(this.summaryApiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ context }),
            });
          }
          console.log("Summary generated in ", Date.now() - start, "ms");
          return response.summary || 'No summary generated';
        } catch (error) {
          console.error('Error generating summary:', error);
          return null;
        }
    }
}
