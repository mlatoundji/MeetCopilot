import fetch from 'node-fetch';
import { getCachedSuggestions, setCachedSuggestions } from '../utils/cache.js';
import { generateLocalSuggestions } from '../services/localLLMService.js';
import crypto from 'crypto';
//import { generateSuggestionsViaMistral as generateMistralSuggestions } from './mistralController.js';

const TIMEOUT = 30000; // Increased to 30 seconds
const MAX_RETRIES = 3;
const CONCURRENT_REQUESTS = 2;

const generateContextHash = (context) => {
    return crypto.createHash('md5').update(context).digest('hex');
};

const retryWithExponentialBackoff = async (fn, retries = MAX_RETRIES, delay = 1000) => {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            console.log(`Attempt ${i + 1} failed:`, error.message);
            lastError = error;
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
            }
        }
    }
    throw lastError;
};

const makeAPIRequest = async (apiEndpoint, apiKey, systemPrompt, context) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
        console.log(`Making API request to ${apiEndpoint}`);
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                model: apiEndpoint.includes('mistral') ? 'mistral-large-latest' : 'gpt-4',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: context },
                ],
                max_tokens: 500,
                temperature: 0.7,
            }),
            signal: controller.signal,
            timeout: TIMEOUT
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

        return data.choices[0].message.content;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out after ' + (TIMEOUT / 1000) + ' seconds');
        }
        throw error;
    }
};

const systemPrompt = `
    Vous êtes un assistant IA spécialisé dans la synthèse et la génération de
    suggestions de réponses d'utilisateurs dans une conversation.
    Fournissez 2 suggestions de réponses potentielles (100-200 mots max chacune) sous forme de liste à puces à la dernière question détectée.
    Basez vos suggestions sur le contexte ci-dessous :
`;

export const generateSuggestionsViaMistral = async (req, res) => {
    try {
        console.log("Generate Suggestions via Mistral AI...");
        const { context } = req.body;

        if (!context) {
            return res.status(400).json({ error: 'Context is required' });
        }

        // Generate hash for caching
        const contextHash = generateContextHash(context);
        
        // Check cache first
        const cachedSuggestions = getCachedSuggestions(contextHash);
        if (cachedSuggestions) {
            console.log("Returning cached suggestions");
            return res.json({ suggestions: cachedSuggestions });
        }

        console.log("Making request to Mistral API...");
        const suggestions = await retryWithExponentialBackoff(async () => {
            return await makeAPIRequest(
                'https://api.mistral.ai/v1/chat/completions',
                process.env.MISTRAL_API_KEY,
                systemPrompt,
                context
            );
        });

        // Cache the suggestions
        setCachedSuggestions(contextHash, suggestions);
        
        console.log("Successfully generated suggestions");
        res.json({ suggestions });
    } catch (error) {
        console.error('Error generating suggestions:', error);
        res.status(error.status || 500).json({ 
            error: error.message || 'Internal Server Error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

export const generateSuggestionsViaOpenAI = async (req, res) => {
    try {
        console.log("Generate Suggestions via OpenAI...");
        const { context } = req.body;

        if (!context) {
            return res.status(400).json({ error: 'Context is required' });
        }
        
        const contextHash = generateContextHash(context);
        const cachedSuggestions = getCachedSuggestions(contextHash);
        if (cachedSuggestions) {
            console.log("Returning cached suggestions");
            return res.json({ suggestions: cachedSuggestions });
        }

        console.log("Making request to OpenAI API...");
        const suggestions = await retryWithExponentialBackoff(async () => {
            return await makeAPIRequest(
                'https://api.openai.com/v1/chat/completions',
                process.env.OPENAI_API_KEY,
                systemPrompt,
                context
            );
        });

        setCachedSuggestions(contextHash, suggestions);
        console.log("Successfully generated suggestions");
        res.json({ suggestions });
    } catch (error) {
        console.error('Error generating suggestions:', error);
        res.status(error.status || 500).json({ 
            error: error.message || 'Internal Server Error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

export const generateParallelSuggestions = async (req, res) => {
    try {
        console.log("Generate Parallel Suggestions...");
        const { context } = req.body;

        if (!context) {
            return res.status(400).json({ error: 'Context is required' });
        }
        
        const contextHash = generateContextHash(context);
        const cachedSuggestions = getCachedSuggestions(contextHash);
        if (cachedSuggestions) {
            console.log("Returning cached suggestions");
            return res.json({ suggestions: cachedSuggestions });
        }

        console.log("Making parallel requests to both APIs...");
        const [mistralSuggestions, openAISuggestions] = await Promise.all([
            retryWithExponentialBackoff(async () => {
                return await makeAPIRequest(
                    'https://api.mistral.ai/v1/chat/completions',
                    process.env.MISTRAL_API_KEY,
                    systemPrompt,
                    context
                );
            }).catch(error => ({ error: error.message })),
            
            retryWithExponentialBackoff(async () => {
                return await makeAPIRequest(
                    'https://api.openai.com/v1/chat/completions',
                    process.env.OPENAI_API_KEY,
                    systemPrompt,
                    context
                );
            }).catch(error => ({ error: error.message }))
        ]);

        const suggestions = {
            mistral: mistralSuggestions.error ? { error: mistralSuggestions.error } : { suggestions: mistralSuggestions },
            openai: openAISuggestions.error ? { error: openAISuggestions.error } : { suggestions: openAISuggestions }
        };

        if (!mistralSuggestions.error && !openAISuggestions.error) {
            setCachedSuggestions(contextHash, suggestions);
        }

        console.log("Successfully generated parallel suggestions");
        res.json(suggestions);
    } catch (error) {
        console.error('Error generating parallel suggestions:', error);
        res.status(error.status || 500).json({ 
            error: error.message || 'Internal Server Error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

export const generateSuggestionsViaLocal = async (req, res) => {
    try {
        const { context } = req.body;
        
        if (!context) {
            return res.status(400).json({ 
                error: 'Context is required',
                details: 'Please provide a context in the request body'
            });
        }

        console.log('Generate Suggestions via Local Mistral...');
        const suggestions = await generateLocalSuggestions(context);
        
        return res.json({ 
            suggestions,
            source: 'local'
        });
    } catch (error) {
        console.error('Error generating local suggestions:', error);
        
        // Fallback to Mistral API
        try {
            console.log('Falling back to Mistral API...');
            const apiResult = await generateSuggestionsViaMistral(req, res);
            // Ne pas envoyer la réponse ici, la fonction generateSuggestionsViaMistral le fait déjà
            return apiResult;
        } catch (apiError) {
            console.error('Fallback to Mistral API failed:', apiError);
            // Si nous sommes ici, c'est que generateSuggestionsViaMistral n'a pas réussi à envoyer la réponse
            return res.status(500).json({ 
                error: 'Failed to generate suggestions (both local and API)',
                details: {
                    localError: error.message,
                    apiError: apiError.message
                }
            });
        }
    }
};

export const generateSuggestionsWithFallback = async (req, res) => {
    try {
        console.log("Generate Suggestions with Local LLM and Mistral fallback...");
        const { context } = req.body;

        if (!context) {
            return res.status(400).json({ error: 'Context is required' });
        }

        // Generate hash for caching
        const contextHash = generateContextHash(context);
        
        // Check cache first
        const cachedSuggestions = getCachedSuggestions(contextHash);
        if (cachedSuggestions) {
            console.log("Returning cached suggestions");
            return res.json({ suggestions: cachedSuggestions });
        }

        // Try local LLM first
        try {
            console.log("Attempting to generate suggestions with Local LLM...");
            const localSuggestions = await generateLocalSuggestions(context);
            if (localSuggestions) {
                console.log("Successfully generated suggestions with Local LLM");
                setCachedSuggestions(contextHash, localSuggestions);
                return res.json({ suggestions: localSuggestions });
            }
        } catch (localError) {
            console.warn("Local LLM failed, falling back to Mistral:", localError.message);
        }

        // Fallback to Mistral if local LLM fails
        console.log("Falling back to Mistral API...");
        const mistralSuggestions = await retryWithExponentialBackoff(async () => {
            return await makeAPIRequest(
                'https://api.mistral.ai/v1/chat/completions',
                process.env.MISTRAL_API_KEY,
                systemPrompt,
                context
            );
        });

        // Cache the suggestions
        setCachedSuggestions(contextHash, mistralSuggestions);
        
        console.log("Successfully generated suggestions with Mistral fallback");
        res.json({ suggestions: mistralSuggestions });
    } catch (error) {
        console.error('Error generating suggestions:', error);
        res.status(error.status || 500).json({ 
            error: error.message || 'Internal Server Error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
  