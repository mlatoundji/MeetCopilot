import express from 'express';
import { buildAssistantImageAnalysisPrompt } from '../services/promptBuilder.js';
import { analyzeImage as analyzeImageMistral } from '../services/mistralService.js';
import { analyzeImage as analyzeImageOpenAI } from '../services/openaiService.js';
const router = express.Router();

/**
 * POST /analyze/:provider
 * body: { image: string } where image is Base64-encoded PNG
 */
router.post('/:provider', async (req, res) => {
  const { provider } = req.params;
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'No image provided' });
  }
  try {
    // Call the vision API depending on provider
    let description;
    if (provider === 'mistral') {
      // Mistral vision via chat completions
      const promptMessages = buildAssistantImageAnalysisPrompt(image);
      const response = await analyzeImageMistral(promptMessages);
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      // Extract assistant message content
      description = data.choices?.[0]?.message?.content || '';
    } else if (provider === 'openai') {
      // OpenAI Vision endpoint
      const response = await analyzeImageOpenAI(image);
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      // OpenAI returns choices with messages
      description = data.choices?.[0]?.message?.content || data.description;
    } else {
      return res.status(400).json({ error: `Unsupported provider: ${provider}` });
    }
    return res.json({ description });
  } catch (error) {
    console.error('Error in image analysis route:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router; 