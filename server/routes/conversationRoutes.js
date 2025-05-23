import express from 'express';
import { addMessages, streamConversation } from '../controllers/conversationController.js';

const router = express.Router();

router.post('/:cid/messages', addMessages);
// Streaming endpoint (SSE)
router.get('/:cid/stream', streamConversation);

export default router; 