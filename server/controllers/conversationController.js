import redis from '../utils/redisClient.js';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { buildPrompt } from '../services/promptBuilder.js';
import { chatCompletion } from '../services/mistralService.js';
import dotenv from 'dotenv';
import { summariseConversationChunk } from '../services/summarizerService.js';
import { estimateTokens } from '../utils/tokenEstimator.js';

dotenv.config();

const supabase = createSupabaseClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const CONV_KEY_PREFIX = 'conv:';

const SUMMARY_TRIGGER_EVERY = 8; // messages
const WINDOW_MAX_TURNS = 10; // keep last N turns verbatim
const SUMMARY_TOKEN_THRESHOLD = 3500; // if prompt tokens exceed, force summary

const fetchConversation = async (cid) => {
  console.log("Fetching conversation", cid);
  const redisKey = `${CONV_KEY_PREFIX}${cid}`;
  let memory = await redis.get(redisKey);
  if (memory) return JSON.parse(memory);

  // fallback to supabase
  const { data, error } = await supabase.from('conversations').select('*').eq('id', cid).single();
  if (error) throw error;
  if (data) {
    console.log("Conversation found", cid);
    await redis.set(redisKey, JSON.stringify(data.memory_json), { EX: 3600 });
    return data.memory_json;
  }
  console.log("No conversation found", cid);
  // no conversation found
  return {
    messages: [],
    summary: '',
  };
};

const persistConversation = async (cid, memory) => {
  console.log("Persisting conversation", cid);
  const redisKey = `${CONV_KEY_PREFIX}${cid}`;
  await redis.set(redisKey, JSON.stringify(memory), { EX: 3600 });
  const upsert = {
    id: cid,
    memory_json: memory,
    last_updated: new Date().toISOString(),
  };
  const { error } = await supabase.from('conversations').upsert(upsert, { onConflict: 'id' });
  if (error) console.error('Supabase upsert conv fail', error.message);
};

export const addMessages = async (req, res) => {
  try {
    const { cid } = req.params;
    const { msg } = req.body; // array of {role, content}

    if (!cid || !Array.isArray(msg) || msg.length === 0) {
      return res.status(400).json({ error: 'cid and msg[] required' });
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

    await persistConversation(cid, memory);

    // optionally build prompt and get assistant reply
    const prompt = buildPrompt(memory);
    const assistantMessage = await chatCompletion(prompt);

    // Append assistant message
    memory.messages.push(assistantMessage);
    await persistConversation(cid, memory);
    console.log("Persisted conversation", cid);
    console.log("Assistant message", assistantMessage);

    res.json({ assistant: assistantMessage, cid });
  } catch (err) {
    console.error('addMessages error', err);
    res.status(500).json({ error: err.message });
  }
}; 