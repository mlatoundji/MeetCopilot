import os from 'os';

export const LLMConfig = {
    // Model settings
    modelPath: '../../models/mistral-7b-instruct-v0.2.Q4_K_M.gguf',
    maxTokens: 500,
    temperature: 0.7,
    
    // Performance settings
    batchSize: 256,
    numThreads: Math.max(2, Math.floor(os.cpus().length * 0.5)),
    gpuLayers: 16,
    contextSize: 2048,
    
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
        topP: 0.9,
        topK: 40,
        repeatPenalty: 1.1,
        presencePenalty: 1.1,
        frequencyPenalty: 1.1,
    },
    
    // Logging settings
    logging: {
        enabled: true,
        level: 'info',
        performance: true,
    }
};

export default LLMConfig; 