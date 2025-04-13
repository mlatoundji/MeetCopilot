import os from 'os';

export const LLMConfig = {
    // Model settings
    modelPath: '../../models/mistral-7b-instruct-v0.2.Q4_K_M.gguf',
    contextSize: 512,
    numThreads: 4,
    batchSize: 64,
    maxTokens: 128,
    temperature: 0.7,
    
    // Performance settings
    gpuLayers: 0,
    
    // GPU settings
    gpu: {
        enabled: false,
        mainGpu: 0,
        tensorSplit: [0],
    },
    
    // Memory settings
    memory: {
        useMmap: true,
        useMLock: false,
    },
    
    // Generation settings
    generation: {
        topK: 40,
        topP: 0.9,
        repeatPenalty: 1.1,
        presencePenalty: 0,
        frequencyPenalty: 0,
    },
    
    // Logging settings
    logging: {
        enabled: true,
        level: 'info',
    }
};

export default LLMConfig; 