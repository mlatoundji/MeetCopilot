import express from 'express';
import { 
    generateSuggestionsViaMistral, 
    generateSuggestionsViaOpenAI,
    generateParallelSuggestions,
    generateSuggestionsViaLocal
} from '../controllers/suggestionController.js';

const router = express.Router();

// Default route uses Local LLM with Mistral API fallback
router.post('/', generateSuggestionsViaMistral);

// Model-specific routes
router.post('/local', generateSuggestionsViaLocal);
router.post('/mistral', generateSuggestionsViaMistral);
router.post('/openai', generateSuggestionsViaOpenAI);

// Parallel processing route (uses both models)
router.post('/parallel', generateParallelSuggestions);

export default router;