import { supabaseClient } from '../utils/supabaseClient.js';
import { extractUserId } from '../utils/extractUserId.js';

/**
 * GET /api/profile
 */
export const getProfile = async (req, res) => {
  const userId = extractUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { data, error } = await supabaseClient
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Supabase getProfile error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data || {});
};

/**
 * PATCH /api/profile
 */
export const updateProfile = async (req, res) => {
  const userId = extractUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { avatar_url, bio, metadata } = req.body;
  const profileData = {
    user_id: userId,
    avatar_url,
    bio,
    metadata,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseClient
    .from('user_profiles')
    .upsert(profileData, { onConflict: ['user_id'], returning: 'representation' })
    .single();

  if (error) {
    console.error('Supabase updateProfile error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
}; 