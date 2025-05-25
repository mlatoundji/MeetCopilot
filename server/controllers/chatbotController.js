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

/**
 * Clear chat session data: remove storage files and DB records
 */
export const clearChatSession = async (req, res) => {
  const { sessionId } = req.params;
  try {
    // List and remove files in storage bucket folder
    const { data: list, error: listErr } = await supabase.storage
      .from('chat-attachments')
      .list(sessionId, { limit: 100 });
    if (!listErr && list.length) {
      const paths = list.map(obj => `${sessionId}/${obj.name}`);
      const { error: removeErr } = await supabase.storage
        .from('chat-attachments')
        .remove(paths);
      if (removeErr) console.error('Supabase remove error', removeErr.message);
    }
    // Delete attachment metadata
    await supabase.from('chat_attachments').delete().eq('session_id', sessionId);
    // Delete chat messages
    await supabase.from('chat_messages').delete().eq('session_id', sessionId);
    res.json({ message: 'Session cleared' });
  } catch (err) {
    console.error('Clear session error', err);
    res.status(500).json({ error: err.message });
  }
};

export { supabase }; 