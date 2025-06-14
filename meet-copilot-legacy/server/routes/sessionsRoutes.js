import express from 'express';
import {
  createSession,
  listSessions,
  getSession,
  updateSession,
  deleteSession,
} from '../controllers/sessionController.js';

const router = express.Router();

// POST   /api/sessions                -> create a new session
router.post('/', createSession);
// GET    /api/sessions?status=...     -> list sessions (optionally by status)
router.get('/', listSessions);
// GET    /api/sessions/:id            -> get session details
router.get('/:id', getSession);
// PATCH  /api/sessions/:id            -> update session (e.g., mark completed)
router.patch('/:id', updateSession);
// DELETE /api/sessions/:id            -> delete session
router.delete('/:id', deleteSession);

export default router; 