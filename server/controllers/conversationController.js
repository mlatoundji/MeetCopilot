import redis from '../utils/redisClient.js';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { estimateTokens } from '../utils/tokenEstimator.js';
import jwt from 'jsonwebtoken';
import { buildAssistantSuggestionPrompt } from '../services/promptBuilder.js';
import { chatCompletion as mistralChatCompletion, streamChatCompletion as mistralStreamChatCompletion } from '../services/mistralService.js';
import { buildAssistantSummaryPrompt } from '../services/promptBuilder.js';
import fetch from 'node-fetch';
import crypto from 'crypto';

dotenv.config();

// Use service role key to bypass row-level security for backend operations
const supabase = createSupabaseClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

const CONV_KEY_PREFIX = 'conv:';

const USE_AUTO_SUMMARIZATION = true;

const SUMMARY_TRIGGER_EVERY = 8; // messages
const WINDOW_MAX_TURNS = 10; // keep last N turns verbatim
const SUMMARY_TOKEN_THRESHOLD = 3500; // if prompt tokens exceed, force summary

const USE_AUTO_SUGGESTION = false

const ASSISTANT_SUGGESTION_TRIGGER_EVERY_MESSAGES = 10; // messages
const ASSISTANT_SUGGESTION_TRIGGER_EVERY_TOKENS = 1000; // tokens

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

const fetchConversation = async (cid) => {
  console.log("Fetching conversation", cid);
  const redisKey = `${CONV_KEY_PREFIX}${cid}`;
  let memoryRaw;
  try {
    memoryRaw = await redis.get(redisKey);
  } catch (err) {
    console.warn('Redis get failed', err.message);
  }
  if (memoryRaw) return JSON.parse(memoryRaw);

  // Try to fetch existing conversation; maybeSingle returns null if not found
  const { data, error } = await supabase.from('conversations').select('*').eq('id', cid).maybeSingle();
  if (error) {
    console.error('Error fetching conversation from Supabase', error.message);
    throw error;
  }
  if (data) {
    console.log("Conversation found", cid);
    try {
      await redis.set(redisKey, JSON.stringify(data.memory_json), { EX: 3600 });
    } catch (err) {
      console.warn('Redis set failed', err.message);
    }
    return data.memory_json;
  }
  console.log("No conversation found", cid);
  // No conversation found; start fresh
  return {
    messages: [],
    summary: '',
  };
};

const fetchConversationContext = async (cid) => {
  const { data, error } = await supabase.from('conversation_context').select('*').eq('conversation_id', cid).maybeSingle();
  return data?.context;
};

const persistConversation = async (cid, memory) => {
  console.log("Persisting conversation", cid);
  const redisKey = `${CONV_KEY_PREFIX}${cid}`;
  try {
    await redis.set(redisKey, JSON.stringify(memory), { EX: 3600 });
  } catch (err) {
    console.warn('Redis set failed', err.message);
  }
  // Retrieve existing conversation to preserve session_id and speaker_id
  let sessionId = null;
  let speakerId = null;
  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('conversations')
      .select('session_id, speaker_id')
      .eq('id', cid)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (existing) {
      sessionId = existing.session_id;
      speakerId = existing.speaker_id;
    }
  } catch (err) {
    console.error('Error fetching existing conversation for persist:', err.message);
  }
  // Upsert conversation record with required foreign keys
  const upsert = {
    id: cid,
    session_id: sessionId,
    speaker_id: speakerId,
    memory_json: memory,
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('conversations').upsert(upsert, { onConflict: 'id' });
  if (error) console.error('Supabase upsert conv fail', error.message);
};

export const addMessages = async (req, res) => {
  try {
    const { cid } = req.params;
    const { msg } = req.body; // array of {role, content}

    // Validate conversation ID
    if (!cid || cid === 'null' || !Array.isArray(msg) || msg.length === 0) {
      return res.status(400).json({ error: 'Valid cid and msg[] required' });
    }

    // Extract user ID from JWT in Authorization header
    const authHeader = req.headers.authorization || '';


    let memory = await fetchConversation(cid);

    memory.messages = (memory.messages || []).concat(msg);

    // === Auto-summary & sliding window ===
    if (USE_AUTO_SUMMARIZATION) {
    const updatedTokenCount = estimateTokens(memory.messages);
    console.log("Token count :", updatedTokenCount);
    const needSummaryByCount = memory.messages.length >= WINDOW_MAX_TURNS + SUMMARY_TRIGGER_EVERY;
    const needSummaryByTokens = updatedTokenCount > SUMMARY_TOKEN_THRESHOLD;
    if (needSummaryByCount || needSummaryByTokens) {
      // summarise everything except last WINDOW_MAX_TURNS
      const chunkToSummarise = memory.messages.slice(0, -WINDOW_MAX_TURNS);
      if (chunkToSummarise.length) {
        try {
          console.log("Summarising chunk", chunkToSummarise);
          const prompt = buildAssistantSummaryPrompt(chunkToSummarise);
          const summary = await mistralChatCompletion(prompt, { model: 'mistral-medium', max_tokens: 250, temperature: 0.4 });
          // Merge with existing summary (concatenate)
          memory.summary = (memory.summary ? memory.summary + "\n" : '') + summary;
        } catch (err) {
          console.warn('Summarisation failed, proceeding without', err.message);
        }
        // Keep only last WINDOW_MAX_TURNS turns
        memory.messages = memory.messages.slice(-WINDOW_MAX_TURNS);
      }
    }
  }

    await persistConversation(cid, memory);

    let lastMessage = memory.messages[memory.messages.length - 1];
    if (lastMessage.speaker === 'User') {
      console.log("User message, no assistant reply");
      return res.json({ assistant: null, cid });
    }

    // before assistant suggestion block, insert caching for default suggestion flow

    // Build prompt and handle caching
    if (USE_AUTO_SUGGESTION) {
      console.log("Building assistant suggestion prompt");
      if (memory.messages.length >= ASSISTANT_SUGGESTION_TRIGGER_EVERY_MESSAGES) {
      const promptMessages = buildAssistantSuggestionPrompt(memory);
        const promptTokens = estimateTokens(promptMessages);
        let assistantMessage;
        if (promptTokens < 2000) {
          const promptHash = crypto.createHash('md5').update(JSON.stringify(promptMessages)).digest('hex');
          const cacheKey = `cache:${cid}:${promptHash}`;
          const cached = await redis.get(cacheKey);
          if (cached) {
            assistantMessage = JSON.parse(cached);
            console.log('Returning assistant response from cache');
          } else {
            assistantMessage = await mistralChatCompletion(promptMessages);
            await redis.set(cacheKey, JSON.stringify(assistantMessage), { EX: 1800 });
          }
        } else {
          assistantMessage = await mistralChatCompletion(promptMessages);
        }
        // Append and persist
        memory.messages.push(assistantMessage);
        await persistConversation(cid, memory);

        return res.json({ assistant: assistantMessage, cid });
      }
      console.log("No assistant suggestion prompt");
      return res.json({ assistant: null, cid });
    }
    console.log("Add messages done");
    return res.json({ assistant: null, cid });
  } catch (err) {
    console.error('addMessages error', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get the stored conversation memory for a given conversation ID
 */
export const getConversation = async (req, res) => {
  try {
    const { cid } = req.params;
    if (!cid) {
      return res.status(400).json({ error: 'cid is required' });
    }
    const { data, error } = await supabase
      .from('conversations')
      .select('memory_json')
      .eq('id', cid)
      .single();
    if (error) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    return res.json({ memory_json: data.memory_json });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Export helpers for auto-tuner
export { fetchConversation, persistConversation, fetchConversationContext, WINDOW_MAX_TURNS }; 
