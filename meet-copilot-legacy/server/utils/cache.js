import NodeCache from 'node-cache';

// Create cache instances with different TTLs and monitoring
const transcriptionCache = new NodeCache({ 
    stdTTL: 3600, // 1 hour
    checkperiod: 600, // Check for expired keys every 10 minutes
    useClones: false // Better performance by not cloning objects
});

const summaryCache = new NodeCache({ 
    stdTTL: 1800, // 30 minutes
    checkperiod: 300, // Check for expired keys every 5 minutes
    useClones: false
});

const suggestionCache = new NodeCache({ 
    stdTTL: 1800, // 30 minutes
    checkperiod: 300,
    useClones: false
});

// Cache statistics
const cacheStats = {
    transcription: { hits: 0, misses: 0 },
    summary: { hits: 0, misses: 0 },
    suggestion: { hits: 0, misses: 0 }
};

export const getCachedTranscription = (audioId) => {
    try {
        const result = transcriptionCache.get(audioId);
        if (result) {
            cacheStats.transcription.hits++;
            return result;
        }
        cacheStats.transcription.misses++;
        return null;
    } catch (error) {
        console.error('Error getting cached transcription:', error);
        return null;
    }
};

export const setCachedTranscription = (audioId, transcription) => {
    try {
        transcriptionCache.set(audioId, transcription);
    } catch (error) {
        console.error('Error setting cached transcription:', error);
    }
};

export const getCachedSummary = (contextHash) => {
    try {
        const result = summaryCache.get(contextHash);
        if (result) {
            cacheStats.summary.hits++;
            return result;
        }
        cacheStats.summary.misses++;
        return null;
    } catch (error) {
        console.error('Error getting cached summary:', error);
        return null;
    }
};

export const setCachedSummary = (contextHash, summary) => {
    try {
        summaryCache.set(contextHash, summary);
    } catch (error) {
        console.error('Error setting cached summary:', error);
    }
};

export const getCachedSuggestions = (contextHash) => {
    try {
        const result = suggestionCache.get(contextHash);
        if (result) {
            cacheStats.suggestion.hits++;
            return result;
        }
        cacheStats.suggestion.misses++;
        return null;
    } catch (error) {
        console.error('Error getting cached suggestions:', error);
        return null;
    }
};

export const setCachedSuggestions = (contextHash, suggestions) => {
    try {
        suggestionCache.set(contextHash, suggestions);
    } catch (error) {
        console.error('Error setting cached suggestions:', error);
    }
};

// Get cache statistics
export const getCacheStats = () => {
    return {
        transcription: {
            ...cacheStats.transcription,
            size: transcriptionCache.keys().length
        },
        summary: {
            ...cacheStats.summary,
            size: summaryCache.keys().length
        },
        suggestion: {
            ...cacheStats.suggestion,
            size: suggestionCache.keys().length
        }
    };
};

// Clear all caches
export const clearAllCaches = () => {
    transcriptionCache.flushAll();
    summaryCache.flushAll();
    suggestionCache.flushAll();
    // Reset stats
    Object.keys(cacheStats).forEach(key => {
        cacheStats[key].hits = 0;
        cacheStats[key].misses = 0;
    });
}; 