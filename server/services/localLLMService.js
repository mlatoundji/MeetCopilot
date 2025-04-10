import { LlamaModel, LlamaContext, LlamaChatSession } from 'node-llama-cpp';
import path from 'path';
import { fileURLToPath } from 'url';
import { LLMConfig } from '../config/llmConfig.js';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODEL_PATH = path.join(__dirname, LLMConfig.modelPath);

let model = null;
let context = null;
let isInitialized = false;
let initializationPromise = null;

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
            console.log('Initializing Local Mistral LLM...');
            console.log(`Model path: ${MODEL_PATH}`);
            
            // Verify model file exists
            if (!fs.existsSync(MODEL_PATH)) {
                throw new Error(`Model file not found at ${MODEL_PATH}`);
            }

            // Initialize the model with optimized settings from config
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
            
            // Create model instance with error handling
            try {
                model = await LlamaModel.create(modelConfig);
                if (!model) {
                    throw new Error('Failed to create LlamaModel instance');
                }
            } catch (modelError) {
                console.error('Error creating LlamaModel:', modelError);
                throw new Error(`Failed to initialize model: ${modelError.message}`);
            }

            // Create context with error handling
            try {
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
            } catch (contextError) {
                console.error('Error creating LlamaContext:', contextError);
                cleanupLocalLLM();
                throw new Error(`Failed to initialize context: ${contextError.message}`);
            }
            
            isInitialized = true;
            console.log('Local Mistral LLM initialized successfully');
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

        if (LLMConfig.logging.enabled) {
            console.log('Generating suggestions with local LLM...');
        }

        const session = new LlamaChatSession({
            context,
            systemPrompt: `You are an AI assistant specialized in synthesizing and generating user response suggestions in a conversation.
            Provide 2 potential response suggestions (100-200 words each) in bullet points to the last detected question.
            Base your suggestions on the context below:`,
        });

        const response = await session.prompt(userContext, {
            maxTokens: LLMConfig.maxTokens,
            temperature: LLMConfig.temperature,
            topP: LLMConfig.generation.topP,
            repeatPenalty: LLMConfig.generation.repeatPenalty,
            topK: LLMConfig.generation.topK,
            presencePenalty: LLMConfig.generation.presencePenalty,
            frequencyPenalty: LLMConfig.generation.frequencyPenalty,
            streamResponse: false,
        });

        return response.trim();
    } catch (error) {
        console.error('Error generating local suggestions:', error);
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

        const session = new LlamaChatSession({
            context,
            systemPrompt: `You are an AI assistant specialized in synthesizing and generating user response suggestions in a conversation.
            Provide 2 potential response suggestions (100-200 words each) in bullet points to the last detected question.
            Base your suggestions on the context below:`,
        });

        const responses = await Promise.all(
            contexts.map(async (context) => {
                try {
                    const response = await session.prompt(context, {
                        maxTokens: LLMConfig.maxTokens,
                        temperature: LLMConfig.temperature,
                        topP: LLMConfig.generation.topP,
                        repeatPenalty: LLMConfig.generation.repeatPenalty,
                        topK: LLMConfig.generation.topK,
                        presencePenalty: LLMConfig.generation.presencePenalty,
                        frequencyPenalty: LLMConfig.generation.frequencyPenalty,
                        streamResponse: false,
                    });
                    return { context, suggestions: response.trim() };
                } catch (error) {
                    console.error(`Error processing context: ${context.slice(0, 100)}...`, error);
                    return { context, error: error.message };
                }
            })
        );

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

// Memory management and cleanup
export const cleanupLocalLLM = () => {
    console.log('Cleaning up LLM resources...');
    try {
        if (context) {
            context.free();
            context = null;
        }
        if (model) {
            model.free();
            model = null;
        }
        isInitialized = false;
        console.log('Cleanup completed successfully');
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}; 