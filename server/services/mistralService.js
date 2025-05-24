import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

export const chatCompletion = async (messages, { model = 'mistral-medium', max_tokens = 256, temperature = 0.7, timeout = 30000, stream = false } = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
      'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ model, messages, max_tokens, temperature, stream }),
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(errorData)}`);
  }
  const data = await response.json();
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid response format from API');
  }
  const assistantMsg = data.choices[0].message;
  return assistantMsg;
} catch (error) {
  clearTimeout(timeoutId);
  if (error.name === 'AbortError') {
    throw new Error('Request timed out after ' + (timeout / 1000) + ' seconds');
  }
  throw error;
}
}; 

export const streamChatCompletion = async (messages, { model = 'mistral-medium', max_tokens = 256, temperature = 0.7, timeout = 30000 } = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({ model, messages, max_tokens, temperature, stream: true }),
    });
  
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const stream = response.body;
    stream.on('data', (chunk) => {
      const str = chunk.toString().trim();
      str.split(/\r?\n\r?\n/).forEach((part) => {
        if (!part.startsWith('data:')) return;
        const payload = part.replace(/^data:\s*/, '');
        if (payload === '[DONE]') return;
        try {
          const parsed = JSON.parse(payload);
          console.log(parsed);
        } catch (err) {
          console.error('Could not parse SSE chunk JSON', err);
        }
      });
    });

    return stream;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};  