import redis from '../utils/redisClient.js';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { buildPrompt } from '../services/promptBuilder.js';
import { chatCompletion } from '../services/mistralService.js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createSupabaseClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const CONV_KEY_PREFIX = 'conv:';

const fetchConversation = async (cid) => {
  const redisKey = `${CONV_KEY_PREFIX}${cid}`;
  let memory = await redis.get(redisKey);
  if (memory) return JSON.parse(memory);

  // fallback to supabase
  const { data, error } = await supabase.from('conversations').select('*').eq('id', cid).single();
  if (error) throw error;
  if (data) {
    await redis.set(redisKey, JSON.stringify(data.memory_json), { EX: 3600 });
    return data.memory_json;
  }
  // no conversation found
  return {
    messages: [],
    summary: '',
  };
};

const persistConversation = async (cid, memory) => {
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

    // TODO: implement summarization & windowing here

    await persistConversation(cid, memory);

    // optionally build prompt and get assistant reply
    const prompt = buildPrompt(memory);
    const assistantMessage = await chatCompletion(prompt);

    // Append assistant message
    memory.messages.push(assistantMessage);
    await persistConversation(cid, memory);

    res.json({ assistant: assistantMessage, cid });
  } catch (err) {
    console.error('addMessages error', err);
    res.status(500).json({ error: err.message });
  }
}; 