import { PrismaClient } from '@prisma/client';
// import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { extractUserId } from '../utils/extractUserId.js';

dotenv.config();

// Initialize Prisma Client for database operations
const prisma = new PrismaClient();
// const supabase = createClient(
//   process.env.SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
// );

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
  // Authentication guard
  const userId = extractUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
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
    const { data, error } = await prisma.sessions.create({
      data: sessionData,
      select: {
        id: true,
        conversation_id: true,
        start_time: true,
        status: true,
      },
    });
    if (error) throw error;
    const session = data;

    // Create host participant for the session
    const participantHostRecord = {
      session_id: session.id,
      user_id: userId,
      name: sessionData.host_name,
      role: 'host',
    };
    const { data: participants, error: participantError } = await prisma.participants.create({
      data: participantHostRecord,
      select: {
        id: true,
      },
    });
    if (participantError) throw participantError;
    const participant = participants[0];

    // Create initial conversation entry
    const conversationRecord = {
      session_id: session.id,
      speaker_id: participant.id,
      memory_json: {},
    };
    const { data: conversations, error: convError } = await prisma.conversations.create({
      data: conversationRecord,
      select: {
        id: true,
      },
    });
    if (convError) throw convError;
    const conversation = conversations[0];

    // Seed conversation_context with initial context
    const contextRecord = {
      conversation_id: conversation.id,
      context: metadata || {},
    };
    const { error: contextError } = await prisma.conversation_context.create({
      data: contextRecord,
    });
    if (contextError) throw contextError;

    return res.status(201).json({
      session_id: session.id,
      conversation_id: session.conversation_id,
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
  // Authentication guard
  const userId = extractUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { status } = req.query;
    const data = await prisma.session.findMany({
      where: {
        user_id: userId,
        status: status || undefined,
      },
      orderBy: {
        start_time: 'desc',
      },
    });
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
  // Authentication guard
  const userId = extractUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { id } = req.params;

    const session = await fetchSession(id, userId);
    // Fetch the associated conversation ID
    const { data: conv, error: convError } = await prisma.conversations.findFirst({
      where: {
        session_id: id,
      },
      orderBy: {
        created_at: 'asc',
      },
      select: {
        id: true,
      },
    });
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
    const session = await prisma.sessions.findUnique({
      where: {
        id: sessionId,
        user_id: userId,
      },
      select: {
        id: true,
        conversation_id: true,
        start_time: true,
        status: true,
      },
    });
    if (!session) throw new Error('Session not found');
    return session;
  } catch (error) {
    console.error('Error fetching session:', error);
    return null;
  }
}

/**
 * Update a session (e.g., mark completed)
 */
export const updateSession = async (req, res) => {
  // Authentication guard
  const userId = extractUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { id } = req.params;
    const { status, custom_context, session_title, description, host_name } = req.body;
    if (!status && custom_context === undefined) {
      return res.status(400).json({ error: 'Status or custom_context is required' });
    }
    const updates = {};
    // Update status if provided
    if (status) {
      if (status === 'completed') {
        updates.status = 'completed';
        updates.end_time = new Date().toISOString();
      } else {
        updates.status = status;
      }
    }
    // Update custom_context if provided
    if (custom_context !== undefined) {
      updates.custom_context = custom_context;
    }
    // Update session_title, description, host_name if provided
    if (session_title !== undefined) updates.session_title = session_title;
    if (description !== undefined) updates.description = description;
    if (host_name !== undefined) updates.host_name = host_name;
    const { data, error } = await prisma.sessions.update({
      where: {
        id: id,
        user_id: userId,
      },
      data: updates,
      select: {
        id: true,
        conversation_id: true,
        start_time: true,
        status: true,
      },
    });
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
  // Authentication guard
  const userId = extractUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { id } = req.params;
    const { error } = await prisma.sessions.delete({
      where: {
        id: id,
        user_id: userId,
      },
    });
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