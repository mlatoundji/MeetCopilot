import path from 'path';
import { fileURLToPath } from 'url';
import { LLMConfig } from '../config/llmConfig.js';
import fs from 'fs';

let LlamaModel, LlamaContext, LlamaChatSession;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODEL_PATH = path.join(__dirname, LLMConfig.modelPath);

let model = null;
let context = null;
let isInitialized = false;
let initializationPromise = null;
let conversationMemory = [];
let responseCache = new Map();
let cacheCleanupInterval = null;

// Cache cleanup interval (5 minutes)
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000;

export const initializeLocalLLM = async () => {
    if (isInitialized) {
        console.log('Local LLM already initialized');
        return true;
    }

    if (initializationPromise) {
        console.log('Initialization already in progress, waiting...');
        return await initializationPromise;
    }

    initializationPromise = (async () => {
        try {
            if (process.env.USE_LOCAL_LLM !== 'true') {
                console.log('Local LLM disabled by env');
                return false;
            }
            // Import dynamique
            let llama;
            try {
                llama = await import('node-llama-cpp');
            } catch (e) {
                console.error('Local LLM not available (node-llama-cpp not installed):', e);
                return false;
            }
            LlamaModel = llama.LlamaModel;
            LlamaContext = llama.LlamaContext;
            LlamaChatSession = llama.LlamaChatSession;

            console.log('Initializing Local Mistral LLM...');
            console.log(`Model path: ${MODEL_PATH}`);
            
            if (!fs.existsSync(MODEL_PATH)) {
                throw new Error(`Model file not found at ${MODEL_PATH}`);
            }

            const modelConfig = {
                modelPath: MODEL_PATH,
                contextSize: LLMConfig.contextSize,
                threads: LLMConfig.numThreads,
                batchSize: LLMConfig.batchSize,
                gpu: LLMConfig.gpu.enabled,
                gpuLayers: LLMConfig.gpuLayers,
                mainGpu: LLMConfig.gpu.mainGpu,
                tensorSplit: LLMConfig.gpu.tensorSplit,
                useMmap: LLMConfig.memory.useMmap,
                useMLock: LLMConfig.memory.useMLock,
            };

            console.log('Model configuration:', modelConfig);
            
            model = new LlamaModel(modelConfig);
            if (!model) {
                throw new Error('Failed to create LlamaModel instance');
            }

            const contextConfig = {
                model,
                threads: LLMConfig.numThreads,
                batchSize: LLMConfig.batchSize,
                contextSize: LLMConfig.contextSize,
            };
            
            context = new LlamaContext(contextConfig);
            if (!context) {
                throw new Error('Failed to create LlamaContext instance');
            }
            
            isInitialized = true;
            console.log('Local Mistral LLM initialized successfully');

            // Start cache cleanup interval
            if (cacheCleanupInterval) {
                clearInterval(cacheCleanupInterval);
            }
            cacheCleanupInterval = setInterval(() => {
                responseCache.clear();
            }, CACHE_CLEANUP_INTERVAL);

            return true;
        } catch (error) {
            console.error('Error initializing Local LLM:', error);
            cleanupLocalLLM();
            return false;
        } finally {
            initializationPromise = null;
        }
    })();

    return await initializationPromise;
};

export const generateLocalSuggestions = async (userContext) => {
    if (!isInitialized) {
        const initialized = await initializeLocalLLM();
        if (!initialized) {
            throw new Error('Local LLM initialization failed');
        }
    }

    try {
        if (!model || !context) {
            throw new Error('Local LLM not properly initialized');
        }

        // Check cache first
        const cacheKey = userContext.slice(0, 100);
        const cachedResponse = responseCache.get(cacheKey);
        if (cachedResponse) {
            return cachedResponse;
        }

        if (LLMConfig.logging.enabled) {
            console.log('Generating suggestions with local LLM...');
        }

        // Optimize context length and add conversation memory
        const truncatedContext = userContext.slice(0, 100);
        const fullContext = [...conversationMemory, truncatedContext].join('\n');

        const session = new LlamaChatSession({
            context,
            systemPrompt: `
            Vous êtes un assistant IA spécialisé dans la synthèse et la génération de
            suggestions de réponses d'utilisateurs dans une conversation.
            Fournissez 2 suggestions de réponses potentielles (100-200 mots max chacune) sous forme de liste à puces à la dernière question détectée.
            Basez vos suggestions sur le contexte ci-dessous :
            `,
        });

        const response = await session.prompt(fullContext, {
            maxTokens: LLMConfig.maxTokens,
            temperature: LLMConfig.temperature,
            topP: LLMConfig.generation.topP,
            repeatPenalty: LLMConfig.generation.repeatPenalty,
            topK: LLMConfig.generation.topK,
            presencePenalty: LLMConfig.generation.presencePenalty,
            frequencyPenalty: LLMConfig.generation.frequencyPenalty,
            streamResponse: true,  // Enable streaming for faster response
        });

        // Collect streamed response
        let fullResponse = '';
        for await (const chunk of response) {
            fullResponse += chunk;
        }

        // Update conversation memory
        conversationMemory.push(truncatedContext);
        if (conversationMemory.length > 3) {  // Reduced memory size
            conversationMemory.shift();
        }

        // Cache the response
        responseCache.set(cacheKey, fullResponse.trim());

        return fullResponse.trim();
    } catch (error) {
        console.error('Error generating local suggestions:', error);
        throw error;
    }
};

export const generateSummary = async (conversationHistory) => {
    if (!isInitialized) {
        const initialized = await initializeLocalLLM();
        if (!initialized) {
            throw new Error('Local LLM initialization failed');
        }
    }

    try {
        const session = new LlamaChatSession({
            context,
            systemPrompt: `
            Vous êtes un assistant IA spécialisé dans la synthèse et la génération de
            résumés de conversations.
            Fournissez un résumé concis et pertinent de la conversation ci-dessous :
            `,
        });

        const response = await session.prompt(conversationHistory, {
            maxTokens: LLMConfig.summary.maxLength,
            temperature: 0.2, // Lower temperature for more focused summaries
            topP: 0.8,
            repeatPenalty: 1.0,
            topK: 20,
            presencePenalty: 0.0,
            frequencyPenalty: 0.0,
            streamResponse: true,  // Enable streaming
        });

        // Collect streamed response
        let fullResponse = '';
        for await (const chunk of response) {
            fullResponse += chunk;
        }

        return fullResponse.trim();
    } catch (error) {
        console.error('Error generating summary:', error);
        throw error;
    }
};

export const transcribeAudio = async (audioData) => {
    if (!isInitialized) {
        const initialized = await initializeLocalLLM();
        if (!initialized) {
            throw new Error('Local LLM initialization failed');
        }
    }

    try {
        const session = new LlamaChatSession({
            context,
            systemPrompt: 'Transcribe the following audio content concisely:',
        });

        const response = await session.prompt(audioData, {
            maxTokens: LLMConfig.maxTokens,
            temperature: 0.1, // Very low temperature for accurate transcription
            topP: 0.8,
            repeatPenalty: 1.0,
            topK: 20,
            presencePenalty: 0.0,
            frequencyPenalty: 0.0,
            streamResponse: true,  // Enable streaming
        });

        // Collect streamed response
        let fullResponse = '';
        for await (const chunk of response) {
            fullResponse += chunk;
        }

        return fullResponse.trim();
    } catch (error) {
        console.error('Error transcribing audio:', error);
        throw error;
    }
};

// Batch processing for multiple suggestions
export const generateLocalBatchSuggestions = async (contexts) => {
    try {
        if (!model || !context) {
            throw new Error('Local LLM not initialized');
        }

        console.log(`Processing batch of ${contexts.length} suggestions...`);
        const startTime = Date.now();

        const responses = [];
        for (const ctx of contexts) {
            try {
                // Limit context size
                const truncatedContext = ctx.slice(0, 100);
                // Instantiate a new session per context
                const session = new LlamaChatSession({
                    context,
                    systemPrompt: 'Generate 2 brief response suggestions based on the context:',
                });
                const result = await session.prompt(truncatedContext, {
                    maxTokens: LLMConfig.maxTokens,
                    temperature: LLMConfig.temperature,
                    topP: LLMConfig.generation.topP,
                    repeatPenalty: LLMConfig.generation.repeatPenalty,
                    topK: LLMConfig.generation.topK,
                    presencePenalty: LLMConfig.generation.presencePenalty,
                    frequencyPenalty: LLMConfig.generation.frequencyPenalty,
                    streamResponse: false,
                });
                responses.push({ context: ctx, suggestions: result.trim() });
            } catch (error) {
                console.error(`Error processing context: ${ctx.slice(0, 100)}...`, error);
                responses.push({ context: ctx, error: error.message });
            }
        }

        const endTime = Date.now();
        const totalTime = (endTime - startTime) / 1000;
        console.log('Batch processing stats:', {
            totalTimeSeconds: totalTime,
            contextsProcessed: contexts.length,
            averageTimePerContext: totalTime / contexts.length
        });

        return responses;
    } catch (error) {
        console.error('Error in batch suggestion generation:', error);
        throw error;
    }
};

export const cleanupLocalLLM = async () => {
    if (isInitialized) {
        try {
            console.log('Cleaning up LLM resources...');
            if (cacheCleanupInterval) {
                clearInterval(cacheCleanupInterval);
                cacheCleanupInterval = null;
            }
            if (context) {
                context = null;
            }
            if (model) {
                model = null;
            }
            conversationMemory = [];
            responseCache.clear();
            isInitialized = false;
            console.log('LLM resources cleaned up successfully');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
} 