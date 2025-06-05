import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { extractUserId } from '../../server/utils/extractUserId.js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

export const createSession = async (req, res) => {
  try {
    const userId = extractUserId(req);
    const { mode, metadata } = req.body;
    if (!mode) return res.status(400).json({ error: 'Mode is required' });
    const sessionData = {
      user_id: userId,
      host_name: metadata?.host_name || 'User',
      session_title: metadata?.session_title || 'Session',
      description: metadata?.description || '',
      custom_context: metadata || {},
      start_time: new Date().toISOString(),
      status: 'pending',
    };
    const { data, error } = await supabase.from('sessions').insert([sessionData]).select();
    if (error) throw error;
    const session = data[0];
    const participantHostRecord = {
      session_id: session.id,
      user_id: userId,
      name: sessionData.host_name,
      role: 'host',
    };
    await supabase.from('participants').insert([participantHostRecord]);
    res.status(201).json({ session_id: session.id, start_time: session.start_time, status: session.status });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: error.message });
  }
};

export const listSessions = async (req, res) => {
  try {
    const userId = extractUserId(req);
    const { status } = req.query;
    let query = supabase.from('sessions').select('*').eq('user_id', userId);
    if (status) query = query.eq('status', status);
    const { data, error } = await query.order('start_time', { ascending: false });
    if (error) throw error;
    res.json({ data });
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getSession = async (req, res) => {
  try {
    const userId = extractUserId(req);
    const { id } = req.params;
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateSession = async (req, res) => {
  try {
    const userId = extractUserId(req);
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const updates = { status: status === 'completed' ? 'completed' : status };
    if (status === 'completed') updates.end_time = new Date().toISOString();
    const { data, error } = await supabase.from('sessions').update(updates).eq('id', id).eq('user_id', userId).select();
    if (error) throw error;
    res.json({ data: data[0] });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteSession = async (req, res) => {
  try {
    const userId = extractUserId(req);
    const { id } = req.params;
    const { error } = await supabase.from('sessions').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: error.message });
  }
}; 