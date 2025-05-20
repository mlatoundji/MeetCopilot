import express from 'express';
import { register } from '../controllers/authController.js';

const router = express.Router();

// POST /api/register
router.post('/', register);

export default router; 