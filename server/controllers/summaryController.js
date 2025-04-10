import fetch from 'node-fetch';
import { getCachedSummary, setCachedSummary } from '../utils/cache.js';
import crypto from 'crypto';

const generateContextHash = (context) => {
    return crypto.createHash('md5').update(context).digest('hex');
};

export const generateSummary = async (req, res) => {
    try {
        console.log("Generate Summary...");
      const systemPrompt = `
  Tu es un assistant IA chargé de résumer un segment de conversation. 
  Le résumé doit être concis (100-200 mots max) et mettre en avant les points clés et éventuellement la dernière question posée par l'interlocuteur [System]. 
  Tes réponses doivent être claires et précises et se concentrer sur les informations les plus importantes.
  Voici le format de la réponse attendue :
  - Points clés : ...
  - Dernière question : ...
      `;
  
      const { context } = req.body;
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: context },
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });
  
      const data = await response.json();
      if (!response.ok) {
        console.log("Summary error: ", data);
        return res.status(response.status).json({ error: data });
      }
        console.log("Summary generated: ", data.choices[0].message.content);
      res.json({ summary: data.choices[0].message.content });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

export const generateSummaryViaMistral = async (req, res) => {
    try {
        console.log("Generate Summary via Mistral AI...");
        const { context } = req.body;
        
        // Generate hash for caching
        const contextHash = generateContextHash(context);
        
        // Check cache first
        const cachedSummary = getCachedSummary(contextHash);
        if (cachedSummary) {
            console.log("Returning cached summary");
            return res.json({ summary: cachedSummary });
        }

        const systemPrompt = `
        Tu es un assistant IA chargé de résumer un segment de conversation. 
        Le résumé doit être concis (100-200 mots max) et mettre en avant les points clés et éventuellement la dernière question posée par l'interlocuteur [System]. 
        Tes réponses doivent être claires et précises et se concentrer sur les informations les plus importantes.
        Voici le format de la réponse attendue :
        - Points clés : ...
        - Dernière question : ...
        `;

        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                model: 'mistral-large-latest',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: context },
                ],
                max_tokens: 300,
                temperature: 0.7,
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            console.log("Summary error: ", data);
            return res.status(response.status).json({ error: data });
        }

        const summary = data.choices[0].message.content;
        console.log("Summary generated: ", summary);

        // Cache the summary
        setCachedSummary(contextHash, summary);

        res.json({ summary });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Batch processing for multiple summaries
export const generateBatchSummaries = async (req, res) => {
    try {
        const { contexts } = req.body;
        if (!Array.isArray(contexts)) {
            return res.status(400).json({ error: 'Contexts must be an array' });
        }

        const summaries = await Promise.all(
            contexts.map(async (context) => {
                const contextHash = generateContextHash(context);
                const cachedSummary = getCachedSummary(contextHash);
                
                if (cachedSummary) {
                    return { context, summary: cachedSummary };
                }

                const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'mistral-large-latest',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: context },
                        ],
                        max_tokens: 300,
                        temperature: 0.7,
                    }),
                });

                const data = await response.json();
                if (!response.ok) {
                    return { context, error: data };
                }

                const summary = data.choices[0].message.content;
                setCachedSummary(contextHash, summary);
                return { context, summary };
            })
        );

        res.json({ summaries });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};