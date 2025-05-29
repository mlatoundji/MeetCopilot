import fetch from 'node-fetch';
import { getCachedSuggestions, setCachedSuggestions } from '../utils/cache.js';
import { generateLocalSuggestions } from '../services/localLLMService.js';
import crypto from 'crypto';
import { chatCompletion as mistralChatCompletion } from '../services/mistralService.js';
import { chatCompletion as openAIChatCompletion } from '../services/openaiService.js';
import { buildAssistantSuggestionPrompt } from '../services/promptBuilder.js';
import { fetchConversation, fetchConversationContext } from '../controllers/conversationController.js';
import { streamChatCompletion as mistralStreamChatCompletion } from '../services/mistralService.js';


const TIMEOUT = 30000; // Increased to 30 seconds
const MAX_RETRIES = 3;
const CONCURRENT_REQUESTS = 2;

const MAX_CONTEXT_LENGTH = 50000; // Maximum context length in characters
const MIN_CONTEXT_LENGTH = 10;    // Minimum context length in characters

const generateContextHash = (context) => {
    return crypto.createHash('md5').update(context).digest('hex');
};

const validateContext = (context) => {
    if (typeof context !== 'string') {
        return { valid: false, error: 'Context must be a string' };
    }
    
    if (!context.trim()) {
        return { valid: false, error: 'Context cannot be empty' };
    }
    
    if (context.length > MAX_CONTEXT_LENGTH) {
        return { valid: false, error: `Context exceeds maximum length of ${MAX_CONTEXT_LENGTH} characters` };
    }
    
    if (context.length < MIN_CONTEXT_LENGTH) {
        return { valid: false, error: `Context must be at least ${MIN_CONTEXT_LENGTH} characters long` };
    }
    
    return { valid: true };
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

export const generateSuggestionsViaMistralFromConversation = async (req, res) => {
        console.log("Generate Suggestions via Mistral AI from Conversation...");
        try {
            const { cid } = req.params;
            const memory = await fetchConversation(cid);
            const prompt = buildAssistantSuggestionPrompt(memory);
            const suggestions = await retryWithExponentialBackoff(async () => {
                return await mistralChatCompletion(prompt);
            });
            res.json({ suggestions });
        } catch (err) {
            console.error('conversation error', err);
            res.status(500).json({ error: err.message });
        }
};

export const generateSuggestionsViaMistral = async (req, res) => {
    try {
        console.log("Generate Suggestions via Mistral AI...");
        const { context } = req.body;

        if (!context) {
            return res.status(400).json({ error: 'Context is required' });
        }

        const validation = validateContext(context);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Generate hash for caching
        const contextHash = generateContextHash(context);
        
        // Check cache first
        const cachedSuggestions = getCachedSuggestions(contextHash);
        if (cachedSuggestions) {
            console.log("Returning cached suggestions");
            return res.json({ suggestions: cachedSuggestions });
        }

        const prompt = buildAssistantSuggestionPrompt(context);

        console.log("Making request to Mistral API...");
        const suggestions = await retryWithExponentialBackoff(async () => {
            return await mistralChatCompletion(prompt);
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

        const validation = validateContext(context);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }
        
        const contextHash = generateContextHash(context);
        const cachedSuggestions = getCachedSuggestions(contextHash);
        if (cachedSuggestions) {
            console.log("Returning cached suggestions");
            return res.json({ suggestions: cachedSuggestions });
        }

        const prompt = buildAssistantSuggestionPrompt(context);

        console.log("Making request to OpenAI API...");
        const suggestions = await retryWithExponentialBackoff(async () => {
            return await openAIChatCompletion(prompt);
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

        const validation = validateContext(context);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }
        
        const contextHash = generateContextHash(context);
        const cachedSuggestions = getCachedSuggestions(contextHash);
        if (cachedSuggestions) {
            console.log("Returning cached suggestions");
            return res.json({ suggestions: cachedSuggestions });
        }

        const prompt = buildAssistantSuggestionPrompt(context);

        console.log("Making parallel requests to both APIs...");
        const [mistralSuggestions, openAISuggestions] = await Promise.all([
            retryWithExponentialBackoff(async () => {
                return await mistralChatCompletion(prompt);
            }).catch(error => ({ error: error.message })),
            
            retryWithExponentialBackoff(async () => {
                return await openAIChatCompletion(prompt);
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

        const validation = validateContext(context);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
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

        const validation = validateContext(context);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
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

        const prompt = buildAssistantSuggestionPrompt(context);

        // Fallback to Mistral if local LLM fails
        console.log("Falling back to Mistral API...");
        const mistralSuggestions = await retryWithExponentialBackoff(async () => {
            return await mistralChatCompletion(prompt);
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

// Stream conversation as server-sent events (SSE)
export const streamSuggestions = async (req, res) => {
    const { cid } = req.params;
    // Set SSE headers
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    res.flushHeaders();
    try {
      // Fetch prior conversation + build prompt
      const memory = await fetchConversation(cid);
      const context = await fetchConversationContext(cid);
      const messages = buildAssistantSuggestionPrompt(context, memory);
  
      // Call Mistral with streaming
      let stream;
      try {
        stream = await mistralStreamChatCompletion(messages);
      } catch (streamErr) {
        console.error('Mistral streaming error', streamErr);
        res.write(`data: ERROR ${streamErr.message}\n\n`);
        return res.end();
      }
  
      // Pipe Mistral's SSE directly to client
      stream.on('data', chunk => {
        res.write(chunk);
      });
      stream.on('end', () => {
        res.end();
      });
      stream.on('error', err => {
        console.error('Stream error', err);
        res.end();
      });
    } catch (err) {
      console.error('Streaming failed', err);
      res.end();
    }
  };
  