import { supabaseClient } from '../utils/supabaseClient.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      return res.status(401).json({ error: error.message });
    }

    const token = data.session?.access_token;
    if (!token) {
      return res.status(500).json({ error: 'Failed to retrieve access token.' });
    }

    return res.json({ access_token: token });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// Add user registration
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name
        }
      }
    });
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const token = data.session?.access_token;
    if (token) {
      return res.json({ access_token: token });
    }
    return res.json({ user: data.user });
  } catch (err) {
    console.error('Register error', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}; 