import express from 'express';
import { addMessages } from '../controllers/conversationController.js';

const router = express.Router();

router.post('/:cid/messages', addMessages);

export default router; 