import express from 'express';
import {
  createSession,
  listSessions,
  getSession,
  updateSession,
  deleteSession,
} from '../controllers/sessionController.js';
import { z } from 'zod';
import { validate } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Validation schema for updating sessions
const updateSessionSchema = z.object({
  host_name: z.string().optional(),
  session_title: z.string().optional(),
  description: z.string().optional(),
  custom_context: z.any().optional(),
  start_time: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date' }).optional(),
  end_time: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date' }).optional(),
  status: z.string().optional(),
});

// POST   /api/sessions                -> create a new session
router.post('/', createSession);
// GET    /api/sessions?status=...     -> list sessions (optionally by status)
router.get('/', listSessions);
// GET    /api/sessions/:id            -> get session details
router.get('/:id', getSession);
// PATCH  /api/sessions/:id            -> update session (e.g., mark completed)
router.patch('/:id', validate(updateSessionSchema), updateSession);
// DELETE /api/sessions/:id            -> delete session
router.delete('/:id', deleteSession);

export default router; 