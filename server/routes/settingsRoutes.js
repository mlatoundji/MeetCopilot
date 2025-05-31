import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';

const router = express.Router();

// GET current user's settings
router.get('/', getSettings);

// PATCH to update or create settings
router.patch('/', updateSettings);

export default router; 