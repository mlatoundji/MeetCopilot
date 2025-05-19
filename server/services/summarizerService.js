import { chatCompletion } from './mistralService.js';

const SYSTEM_PROMPT = `Tu es un assistant IA chargé de résumer un extrait de conversation en français. Résume de façon concise (≤250 mots) les points clés, décisions, et actions à retenir. Utilise des puces si pertinent.`;

export const summariseConversationChunk = async (recentMessages) => {
  // recentMessages is array of {role, content}
  const contextText = recentMessages.map(m => `${m.role}: ${m.content}`).join('\n');
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: contextText },
  ];
  const summaryMsg = await chatCompletion(messages, { model: 'mistral-medium', max_tokens: 250, temperature: 0.4 });
  return summaryMsg.content;
}; 