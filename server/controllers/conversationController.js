import redis from '../utils/redisClient.js';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { buildPrompt } from '../services/promptBuilder.js';
import { chatCompletion } from '../services/mistralService.js';
import dotenv from 'dotenv';
import { summariseConversationChunk } from '../services/summarizerService.js';
import { estimateTokens } from '../utils/tokenEstimator.js';
import jwt from 'jsonwebtoken';

dotenv.config();

// Use service role key to bypass row-level security for backend operations
const supabase = createSupabaseClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

const CONV_KEY_PREFIX = 'conv:';

const SUMMARY_TRIGGER_EVERY = 8; // messages
const WINDOW_MAX_TURNS = 10; // keep last N turns verbatim
const SUMMARY_TOKEN_THRESHOLD = 3500; // if prompt tokens exceed, force summary

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
  const { data, error } = await supabase.from('conversations').select('*').eq('cid', cid).maybeSingle();
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

const persistConversation = async (cid, memory, userId) => {
  console.log("Persisting conversation", cid);
  const redisKey = `${CONV_KEY_PREFIX}${cid}`;
  try {
    await redis.set(redisKey, JSON.stringify(memory), { EX: 3600 });
  } catch (err) {
    console.warn('Redis set failed', err.message);
  }
  const upsert = {
    cid: cid,
    user_id: userId,
    memory_json: memory,
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('conversations').upsert(upsert, { onConflict: 'cid' });
  if (error) console.error('Supabase upsert conv fail', error.message);
};

export const addMessages = async (req, res) => {
  try {
    const { cid } = req.params;
    const { msg } = req.body; // array of {role, content}

    if (!cid || !Array.isArray(msg) || msg.length === 0) {
      return res.status(400).json({ error: 'cid and msg[] required' });
    }

    // Extract user ID from JWT in Authorization header
    const authHeader = req.headers.authorization || '';
    let userId = null;
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = jwt.decode(token);
      if (decoded && decoded.sub) userId = decoded.sub;
    }

    let memory = await fetchConversation(cid);

    memory.messages = (memory.messages || []).concat(msg);

    // === Auto-summary & sliding window ===
    const updatedTokenCount = estimateTokens(memory.messages);
    const needSummaryByCount = memory.messages.length >= WINDOW_MAX_TURNS + SUMMARY_TRIGGER_EVERY;
    const needSummaryByTokens = updatedTokenCount > SUMMARY_TOKEN_THRESHOLD;
    if (needSummaryByCount || needSummaryByTokens) {
      // summarise everything except last WINDOW_MAX_TURNS
      const chunkToSummarise = memory.messages.slice(0, -WINDOW_MAX_TURNS);
      if (chunkToSummarise.length) {
        try {
          console.log("Summarising chunk", chunkToSummarise);
          const summaryText = await summariseConversationChunk(chunkToSummarise);
          // Merge with existing summary (concatenate)
          memory.summary = (memory.summary ? memory.summary + "\n" : '') + summaryText;
        } catch (err) {
          console.warn('Summarisation failed, proceeding without', err.message);
        }
        // Keep only last WINDOW_MAX_TURNS turns
        memory.messages = memory.messages.slice(-WINDOW_MAX_TURNS);
      }
    }

    await persistConversation(cid, memory, userId);

    // If the incoming delta didn't originate from user, skip assistant generation
    // const lastIncoming = msg[msg.length - 1];
    // if (lastIncoming.role !== 'user') {
      return res.json({ assistant: null, cid });
    // }

    // optionally build prompt and get assistant reply
    // console.log("Building prompt");
    // const prompt = buildPrompt(memory);
    // console.log("Prompt built", prompt);
    // const assistantMessage = await chatCompletion(prompt);
    // console.log("Assistant message", assistantMessage);

    // // Append assistant message
    // memory.messages.push(assistantMessage);
    // await persistConversation(cid, memory, userId);
    // console.log("Persisted conversation", cid);

    // res.json({ assistant: assistantMessage, cid });
  } catch (err) {
    console.error('addMessages error', err);
    res.status(500).json({ error: err.message });
  }
}; 