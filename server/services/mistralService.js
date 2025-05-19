import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

export const chatCompletion = async (messages, { model = 'mistral-medium', max_tokens = 256, temperature = 0.7 } = {}) => {
  const resp = await fetch(MISTRAL_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ model, messages, max_tokens, temperature, stream: false }),
  });
  if (!resp.ok) {
    const errData = await resp.text();
    throw new Error(`Mistral API error ${resp.status}: ${errData}`);
  }
  const data = await resp.json();
  const assistantMsg = data.choices[0].message;
  return assistantMsg;
}; 