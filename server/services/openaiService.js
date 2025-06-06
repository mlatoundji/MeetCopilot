import fetch from 'node-fetch';
import dotenv from 'dotenv';
import https from 'https';

dotenv.config();

const CHATGPT_API_URL = 'https://api.openai.com/v1/chat/completions';

const keepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 100, keepAliveMsecs: 30000 });

export const chatCompletion = async (messages, { model = 'gpt-4o-mini', max_tokens = 256, temperature = 0.7, timeout = 30000 } = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(CHATGPT_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            agent: keepAliveAgent,
            body: JSON.stringify({ model, messages, max_tokens, temperature, stream: false }),
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
}

export const analyzeImage = async (image, { model = 'gpt-4o-mini-vision', max_tokens = 500, temperature = 0.7, stream = false } = {}) => {
    const response = await fetch(CHATGPT_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        agent: keepAliveAgent,
        body: JSON.stringify({ model, image, max_tokens, temperature, stream }),
    });
    return response;
}

