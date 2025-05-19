export const estimateTokens = (textOrMessages) => {
  if (Array.isArray(textOrMessages)) {
    textOrMessages = textOrMessages.map(m => m.content).join(' ');
  }
  const words = (textOrMessages || '').split(/\s+/).filter(Boolean);
  return Math.ceil(words.length / 0.75);
}; 