import os from 'os';

export const LLMConfig = {
    // Model settings
    modelPath: '../../models/mistral-7b-instruct-v0.2.Q4_K_M.gguf',
    contextSize: 1024,
    numThreads: Math.max(4, Math.floor(os.cpus().length * 0.9)),
    batchSize: 256,
    maxTokens: 128,
    temperature: 0.5,
    
    // Performance settings
    gpuLayers: 32,
    
    // GPU settings
    gpu: {
        enabled: true,
        mainGpu: 0,
        tensorSplit: [0],
    },
    
    // Memory settings
    memory: {
        useMmap: true,
        useMLock: true,
    },
    
    // Generation settings
    generation: {
        topK: 20,
        topP: 0.8,
        repeatPenalty: 1.0,
        presencePenalty: 0.0,
        frequencyPenalty: 0.0,
    },
    
    // Logging settings
    logging: {
        enabled: true,
        level: 'info',
    },

    // Transcription specific settings
    transcription: {
        maxAudioLength: 15,
        minConfidence: 0.7,
        language: 'en',
    },

    // Summary settings
    summary: {
        interval: 3,
        maxLength: 250,
        keywords: [],
    }
};

export default LLMConfig; 