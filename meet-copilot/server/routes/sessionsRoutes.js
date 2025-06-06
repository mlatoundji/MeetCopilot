import express from 'express';
import {
  createSession,
  listSessions,
  getSession,
  updateSession,
  deleteSession,
} from '../controllers/sessionController.js';

const router = express.Router();

router.post('/', createSession);
router.get('/', listSessions);
router.get('/:id', getSession);
router.patch('/:id', updateSession);
router.delete('/:id', deleteSession);

export default router; 