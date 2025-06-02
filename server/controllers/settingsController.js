import { supabaseClient } from '../utils/supabaseClient.js';
import { extractUserId } from '../utils/extractUserId.js';

/**
 * GET /api/settings
 */
export const getSettings = async (req, res) => {
  const userId = extractUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { data, error } = await supabaseClient
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  // If no settings found, return defaults
  if (error && error.code !== 'PGRST116') {
    console.error('Supabase getSettings error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data || {});
};

/**
 * PATCH /api/settings
 */
export const updateSettings = async (req, res) => {
  const userId = extractUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { language, theme, notifications } = req.body;
  const settingsData = {
    user_id: userId,
    language,
    theme,
    notifications,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseClient
    .from('user_settings')
    .upsert(settingsData, { onConflict: ['user_id'], returning: 'representation' })
    .single();

  if (error) {
    console.error('Supabase updateSettings error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
}; 