import express from 'express';
import { getProfile, updateProfile } from '../controllers/profileController.js';

const router = express.Router();

// GET current user's profile
router.get('/', getProfile);

// PATCH to update or create profile
router.patch('/', updateProfile);

export default router; 