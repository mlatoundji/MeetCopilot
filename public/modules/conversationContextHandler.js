/**
 * Handles sending audio data for transcription and receiving the results.
 */

export class ConversationContextHandler {
    constructor(apiHandler) {
       
        this.apiHandler = apiHandler;
      
        
        this.conversationContextDialogs = [];
        this.conversationContextSuggestions = [];


        this.SYSTEM_SOURCE = 'system';
        this.MIC_SOURCE = 'mic';

        this.systemLabel = "Guest";
        this.micLabel = "User";

        this.startTime = Date.now();
        this.useRelativeTime = false;
        

        this.conversationId = null;
        this.unsentMessages = [];
        console.log("Conversation ID", this.conversationId);
    }

      resetConversationContext() {
        this.conversationContextDialogs = [];
        this.conversationContextSuggestions = [];
      }

    async sendConversationMessage() {
      console.log("Sending conversation message to server");
      if(this.unsentMessages.length > 0 && this.apiHandler){
        let delta;
        try {
            delta = this.unsentMessages.splice(0, this.unsentMessages.length);
            console.log("Sending unsent messages", delta);
            const res = await this.apiHandler.sendConversationMessagesCbor(this.conversationId, delta);
            console.log("Conversation delta sent", res.cid);
        } catch(err){
            console.error('Failed to push conversation delta', err);
            // Requeue messages on failure
            if (delta) this.unsentMessages.unshift(...delta);
        }
    }
  }

    /**
     * No-op translation hook for conversation context.
     * @param {string} langCode
     */
    translateContext(langCode) {
        // Intentionally empty: conversation context does not require UI translations for now.
    }

}
