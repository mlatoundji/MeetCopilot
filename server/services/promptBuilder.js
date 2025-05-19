export const buildPrompt = (memory) => {
  const { summary = '', messages = [] } = memory;
  const lastTurns = messages.slice(-6);
  const promptMessages = [];
  if (summary) {
    promptMessages.push({ role: 'system', content: `Résumé de la conversation jusque-là : ${summary}` });
  }
  promptMessages.push(...lastTurns);
  return promptMessages;
}; 