import fetch from 'node-fetch';
import { getCachedSummary, setCachedSummary } from '../utils/cache.js';
import crypto from 'crypto';
import { buildAssistantSummaryPrompt, buildAssistantDetailedSummaryPrompt } from '../services/promptBuilder.js';
import { chatCompletion as openAIChatCompletion } from '../services/openaiService.js';
import { chatCompletion as mistralChatCompletion } from '../services/mistralService.js';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fetchConversation, fetchConversationContext } from './conversationController.js';
import { fetchSession } from './sessionController.js';
import { extractUserId } from '../utils/extractUserId.js';
import { estimateTokens } from '../utils/tokenEstimator.js';

dotenv.config();

const supabase = createSupabaseClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

// Constants for validation
const MAX_CONTEXT_LENGTH = 50000; // Maximum context length in characters
const MIN_CONTEXT_LENGTH = 10;    // Minimum context length in characters

const generateContextHash = (context) => {
    return crypto.createHash('md5').update(context).digest('hex');
};

const validateContext = (context) => {
    if (typeof context !== 'string') {
        return { valid: false, error: 'Context must be a string' };
    }
    
    if (!context.trim()) {
        return { valid: false, error: 'Context cannot be empty' };
    }
    
    if (context.length > MAX_CONTEXT_LENGTH) {
        return { valid: false, error: `Context exceeds maximum length of ${MAX_CONTEXT_LENGTH} characters` };
    }
    
    if (context.length < MIN_CONTEXT_LENGTH) {
        return { valid: false, error: `Context must be at least ${MIN_CONTEXT_LENGTH} characters long` };
    }
    
    return { valid: true };
};

export const generateSummary = async (req, res) => {
    try {
        console.log("Generate Summary...");
        const { context } = req.body;
        
        const validation = validateContext(context);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Generate hash for caching
        const contextHash = generateContextHash(context);

        // Check cache first
        const cachedSummary = getCachedSummary(contextHash);
        if (cachedSummary) {
            console.log("Returning cached summary");
            return res.json({ summary: cachedSummary });
        }

        const prompt = buildAssistantSummaryPrompt(context);
        const summary = await openAIChatCompletion(prompt);

        // Cache the summary
        setCachedSummary(contextHash, summary);
        res.json({ summary });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const generateSummaryViaMistral = async (req, res) => {
    try {
        console.log("Generate Summary via Mistral AI...");
        const { context } = req.body;
        
        const validation = validateContext(context);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }
        
        // Generate hash for caching
        const contextHash = generateContextHash(context);
        
        // Check cache first
        const cachedSummary = getCachedSummary(contextHash);
        if (cachedSummary) {
            console.log("Returning cached summary");
            return res.json({ summary: cachedSummary });
        }

        const prompt = buildAssistantSummaryPrompt(context);
        const summary = await mistralChatCompletion(prompt);

        // Cache the summary
        setCachedSummary(contextHash, summary);

        res.json({ summary });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Batch processing for multiple summaries
export const generateBatchSummaries = async (req, res) => {
    try {
        const { contexts } = req.body;
        if (!Array.isArray(contexts)) {
            return res.status(400).json({ error: 'Contexts must be an array' });
        }

        // Validate all contexts before processing
        const validationErrors = contexts.map((context, index) => {
            const validation = validateContext(context);
            return validation.valid ? null : { index, error: validation.error };
        }).filter(error => error !== null);

        if (validationErrors.length > 0) {
            return res.status(400).json({ 
                error: 'Invalid contexts found', 
                details: validationErrors 
            });
        }

        const summaries = await Promise.all(
            contexts.map(async (context) => {
                const contextHash = generateContextHash(context);
                const cachedSummary = getCachedSummary(contextHash);
                
                if (cachedSummary) {
                    return { context, summary: cachedSummary };
                }

                const prompt = buildAssistantSummaryPrompt(context);
                const summary = await openAIChatCompletion(prompt);

                setCachedSummary(contextHash, summary);
                return { context, summary };
            })
        );

        res.json({ summaries });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Detailed summary generation at end of session
export const generateDetailedSummary = async (req, res) => {
    try {
        const { session_id, conversation_id } = req.body;
        if (!session_id || !conversation_id) {
            return res.status(400).json({ error: 'session_id and conversation_id are required' });
        }
        const userId = extractUserId(req);
        const session = await fetchSession(session_id, userId);
        const memory = await fetchConversation(conversation_id);
        const context = await fetchConversationContext(conversation_id);  
        
        // Build prompt and generate summary
        const prompt = buildAssistantDetailedSummaryPrompt(memory, context, session);
        console.log("Prompt", prompt);
        const promptTokens = estimateTokens(prompt);
        console.log("Prompt tokens", promptTokens);
        if(promptTokens > 20000){
            return res.status(400).json({ error: 'Context exceeds maximum length of 20000 tokens' });
        }
        const summary = await mistralChatCompletion(prompt);
        // Persist into summaries table
        const { error: insertErr } = await supabase.from('summaries').insert({
            session_id,
            conversation_id,
            summary_type: 'manual',
            summary_text: summary
        });
        if (insertErr) throw insertErr;
        res.json({ summary });
    } catch (error) {
        console.error('Error generating detailed summary:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

/**
 * Load a previously generated detailed summary.
 */
export const loadDetailedSummary = async (req, res) => {
  try {
    const { session_id, conversation_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }
    // Fetch manual/detailed summaries for this session (and conversation if provided)
    let query = supabase
      .from('summaries')
      .select('summary_text')
      .eq('session_id', session_id)
      .eq('summary_type', 'manual');
    if (conversation_id) {
      query = query.eq('conversation_id', conversation_id);
    }
    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) throw error;
    const summaries = data.map(row => row.summary_text);
    return res.json({ summaries });
  } catch (err) {
    console.error('Error loading detailed summary:', err);
    return res.status(500).json({ error: err.message });
  }
};