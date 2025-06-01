import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { extractUserId } from '../utils/extractUserId.js';

dotenv.config();

// Use service role key to bypass row-level security for backend operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

/**
    try {
      const decoded = jwt.decode(token);
      return decoded?.sub || null;
    } catch {
      return null;
    }
  }
  return null;
};

/**
 * Create a new session (status = pending)
 */
export const createSession = async (req, res) => {
  try {
    const userId = extractUserId(req);
    const { mode, metadata } = req.body;
    if (!mode) {
      return res.status(400).json({ error: 'Mode is required' });
    }
    const sessionData = {
      user_id: userId,
      host_name: metadata?.host_name || 'User',
      session_title: metadata?.session_title || 'Meeting',
      description: metadata?.description || '',
      custom_context: metadata || {},
      start_time: new Date().toISOString(),
      status: 'pending',
    };
    const { data, error } = await supabase
      .from('sessions')
      .insert([sessionData])
      .select();
    if (error) throw error;
    const session = data[0];

    // Create host participant for the session
    const participantHostRecord = {
      session_id: session.id,
      user_id: userId,
      name: sessionData.host_name,
      role: 'host',
    };
    const { data: participants, error: participantError } = await supabase
      .from('participants')
      .insert([participantHostRecord])
      .select();
    if (participantError) throw participantError;
    const participant = participants[0];

    // Create initial conversation entry
    const conversationRecord = {
      session_id: session.id,
      speaker_id: participant.id,
      memory_json: {},
    };
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .insert([conversationRecord])
      .select();
    if (convError) throw convError;
    const conversation = conversations[0];

    // Seed conversation_context with initial context
    const contextRecord = {
      conversation_id: conversation.id,
      context: metadata || {},
    };
    const { error: contextError } = await supabase
      .from('conversation_context')
      .insert([contextRecord]);
    if (contextError) throw contextError;

    return res.status(201).json({
      session_id: session.id,
      conversation_id: conversation.id,
      start_time: session.start_time,
      status: session.status,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * List sessions for the current user, optionally filtered by status
 */
export const listSessions = async (req, res) => {
  try {
    const userId = extractUserId(req);
    const { status } = req.query;
    let query = supabase.from('sessions').select('*').eq('user_id', userId);
    if (status) {
      query = query.eq('status', status);
    }
    const { data, error } = await query.order('start_time', { ascending: false });
    if (error) throw error;
    return res.json({ data });
  } catch (error) {
    console.error('Error listing sessions:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get a specific session by ID
 */
export const getSession = async (req, res) => {
  try {
    const userId = extractUserId(req);
    const { id } = req.params;

    const session = await fetchSession(id, userId);
    // Fetch the associated conversation ID
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (convError) throw convError;
    session.conversation_id = conv?.id || null;

    return res.json({ data: session });
  } catch (error) {
    console.error('Error fetching session:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const fetchSession = async (sessionId, userId) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching session:', error);
    return null;
  }
}

/**
 * Update a session (e.g., mark completed)
 */
export const updateSession = async (req, res) => {
  try {
    const userId = extractUserId(req);
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    const updates = {};
    if (status === 'completed') {
      updates.status = 'completed';
      updates.end_time = new Date().toISOString();
    } else {
      updates.status = status;
    }
    const { data, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select();
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Session not found' });
      }
      throw error;
    }
    return res.json({ data });
  } catch (error) {
    console.error('Error updating session:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a session and all related data
 */
export const deleteSession = async (req, res) => {
  try {
    const userId = extractUserId(req);
    const { id } = req.params;
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Session not found' });
      }
      throw error;
    }
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting session:', error);
    return res.status(500).json({ error: error.message });
  }
}; 