import express from 'express';
import { login } from '../controllers/authController.js';

const router = express.Router();

// POST /api/login
router.post('/', login);

export default router; 