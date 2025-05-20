import express from 'express';
import { generateSummaryViaMistral, generateBatchSummaries } from '../controllers/summaryController.js';
import { getCacheStats, clearAllCaches } from '../utils/cache.js';
import { generateLocalSuggestions, generateLocalBatchSuggestions } from '../services/localLLMService.js';

const router = express.Router();

// Summary routes
router.post('/', generateSummaryViaMistral); // Default route uses Mistral
router.post('/mistral', generateSummaryViaMistral); // Explicit Mistral route
router.post('/local', async (req, res) => {
    try {
        const { context } = req.body;
        if (!context) {
            return res.status(400).json({ error: 'Context is required' });
        }
        const suggestions = await generateLocalSuggestions(context);
        res.json({ suggestions });
    } catch (error) {
        console.error('Error generating local suggestions:', error);
        res.status(500).json({ error: 'Failed to generate suggestions' });
    }
});

router.post('/batch', async (req, res) => {
    try {
        const { contexts } = req.body;
        if (!contexts || !Array.isArray(contexts)) {
            return res.status(400).json({ error: 'Contexts array is required' });
        }
        const suggestions = await generateLocalBatchSuggestions(contexts);
        res.json({ suggestions });
    } catch (error) {
        console.error('Error generating batch suggestions:', error);
        res.status(500).json({ error: 'Failed to generate batch suggestions' });
    }
});

// Cache monitoring routes
router.get('/cache/stats', (req, res) => {
    res.json(getCacheStats());
});

// Protected cache clearing endpoint
router.post('/cache/clear', (req, res) => {
    clearAllCaches();
    res.json({ message: 'All caches cleared successfully' });
});

export default router;