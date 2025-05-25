import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Ensure service role key is provided for private bucket operations
if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL in environment');
  process.exit(1);
}
// Initialize Supabase client with service role key
const supabase = createSupabaseClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

/**
 * Fetch chat history for a given session ID
 */
export const fetchChatHistory = async (req, res) => {
  const { sessionId } = req.params;
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Supabase fetch chat history error', error.message);
      return res.status(500).json({ error: error.message });
    }
    res.json({ messages: data });
  } catch (err) {
    console.error('Error fetching chat history', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Add a chat message to history for a given session ID
 */
export const addChatHistory = async (req, res) => {
  const { sessionId } = req.params;
  const { role, content } = req.body;
  if (!role || !content) {
    return res.status(400).json({ error: 'role and content are required' });
  }
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{ session_id: sessionId, role, content }])
      .select();
    if (error) {
      console.error('Supabase insert chat message error', error.message);
      return res.status(500).json({ error: error.message });
    }
    res.json({ message: data[0] });
  } catch (err) {
    console.error('Error adding chat history', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export { supabase }; 