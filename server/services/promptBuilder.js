export const buildAssistantSuggestionPrompt= (conversation, context=null) => {
  const systemPrompt = `
  Vous êtes un assistant IA spécialisé dans la synthèse et la génération de
  suggestions de réponses d'utilisateurs dans une conversation.
  Fournissez 2 suggestions de réponses potentielles (100-200 mots max chacune) sous forme de liste à puces à la dernière question détectée.
  Basez vos suggestions sur la conversation ci-dessous :
`;
  if (typeof conversation == 'object') {
    const { summary = '', messages = [] } = conversation;
    const lastTurns = messages.slice(-6);
    let promptMessages = [];
  promptMessages.push({ role: 'system', content: systemPrompt });
  if (context) {
    const contextText = Object.entries(context)
      .filter(([_, value]) => value != null && value !== '')
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    
    const contextPrompt = `
    Contexte de la conversation : 
      ${contextText}
    `;
    console.log("Context prompt", contextPrompt);
    promptMessages.push({ role: 'user', content: contextPrompt });
  }
  if (summary) {
    promptMessages.push({ role: 'user', content: `Résumé de la conversation jusque-là : ${summary}` });
  }
  for (const message of lastTurns) {
      promptMessages.push({ role: 'user', content: `${message.speaker}: ${message.text}` });
    }
    return promptMessages;
  }
  else if (typeof conversation === 'string') {
    const promptMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: conversation },
    ];
    return promptMessages;
  }
  else {
    throw new Error('Conversation must be an object or a string');
  }
}; 

export const buildAssistantSummaryPrompt = (conversation) => {
  const systemPrompt = `
Tu es un assistant IA chargé de résumer un segment de conversation. 
Le résumé doit être concis (100-200 mots max) et mettre en avant les points clés et éventuellement la dernière question posée par l'invité. 
Tes réponses doivent être claires et précises et se concentrer sur les informations les plus importantes.
Voici le format de la réponse attendue :
- Points clés : ...
- Dernière question : ...
Voici la conversation à résumer :
`;
  if (Array.isArray(conversation)) {
    const contextText = conversation
   .map(m => `${m.speaker}: ${m.text}`)
   .join('\n');
    const promptMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: contextText },
    ];
    return promptMessages;
  }
  else if (typeof conversation === 'string') {
    const promptMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: conversation },
    ];
    return promptMessages;
  }
  else {
    throw new Error('Conversation must be an array or a string');
  }
};

export const buildAssistantDetailedSummaryPrompt = (conversation, context=null, session=null) => {

  const systemPrompt = `
  Tu es un assistant IA chargé de résumer une conversation en détail.
  Le résumé doit être complet et détaillé, incluant toutes les informations importantes de la conversation.
  Voici la conversation à résumer :
`;
  if (typeof conversation == 'object') {
    const { summary = '', messages = [] } = conversation;
    let promptMessages = [];
    promptMessages.push({ role: 'system', content: systemPrompt });
    if (session) {
      if (session.description) {
        const { description = '' } = session.description;
        promptMessages.push({ role: 'user', content: `Description de la session : ${description}` });
      }
    }
    if (context) {
    const contextText = Object.entries(context)
    .filter(([_, value]) => value != null && value !== '')
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
    const contextPrompt = `
    Contexte de la conversation : 
      ${contextText}
    `;
    promptMessages.push({ role: 'user', content: contextPrompt });
    }
    if (summary) {
      promptMessages.push({ role: 'user', content: `Résumé de la conversation jusque-là : ${summary}` });
    }
    for (const message of messages) {
      promptMessages.push({ role: 'user', content: `${message.speaker}: ${message.text}` });
    }

    return promptMessages;
  }
  else if (typeof conversation === 'string') {
    const promptMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: conversation },
    ];
    return promptMessages;
  }
  else {
    throw new Error('Conversation must be an array or a string');
  }
};

export const buildAssistantImageAnalysisPrompt = (image) => {
  const systemPrompt = `
  Vous êtes un assistant IA chargé d'analyser une image et de fournir une description concise et pertinente.
  Voici l'image à analyser :
`;

  let promptMessages = [];
  let userContentMessage = [
    { type: 'image_url', image_url: image }
  ]
  promptMessages.push({ role: 'system', content: systemPrompt });
  promptMessages.push({ role: 'user', content: userContentMessage });
  return promptMessages;
};

export const buildChatbotMessages = (history, question, contextSnippet, uploadedUrls=[], attachmentDescriptions = []) => {
  const messages = [];
  messages.push({ role: 'system', content: 'You are a helpful AI assistant.' });
  if (history) {
    for (const message of history) {
      messages.push({ role: message.role, content: message.content });
    }
  }
  if (question) messages.push({ role: 'user', content: question });
  if (contextSnippet) messages.push({ role: 'system', content: `Context: ${contextSnippet}` });
  if (attachmentDescriptions.length > 0) {
    messages.push({ role: 'system', content: `Image descriptions:\n${attachmentDescriptions.join('\n')}` });
  }
  if (uploadedUrls.length > 0) {
    messages.push({ role: 'system', content: `Attached files: ${uploadedUrls.join(', ')}` });
  }
  return messages;
};