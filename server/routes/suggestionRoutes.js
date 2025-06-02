import express from 'express';
import { 
    generateSuggestionsViaMistral, 
    generateSuggestionsViaOpenAI,
    generateParallelSuggestions,
    generateSuggestionsViaLocal,
    generateSuggestionsWithFallback,
    streamSuggestions,
    saveSuggestions,
    loadSuggestions
} from '../controllers/suggestionController.js';

const router = express.Router();

// Default route uses Local LLM with Mistral API fallback
router.post('/', generateSuggestionsWithFallback);

// Model-specific routes
router.post('/local', generateSuggestionsViaLocal);
router.post('/mistral', generateSuggestionsViaMistral);
router.post('/openai', generateSuggestionsViaOpenAI);

// Parallel processing route (uses both models)
router.post('/parallel', generateParallelSuggestions);

// Streaming endpoint (SSE)
router.get('/:cid/stream', streamSuggestions);

// Persistence routes for saving and loading suggestions
router.post('/save', saveSuggestions);
router.get('/load', loadSuggestions);

export default router;