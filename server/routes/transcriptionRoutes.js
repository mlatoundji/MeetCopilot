import express from 'express';
import multer from 'multer';
import { transcribeWhisper } from '../controllers/transcriptionController.js';
import { transcribeAssemblyAI } from '../controllers/transcriptionController.js';

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
  });

// Routes
router.post('/whisper', upload.single('audio'), transcribeWhisper);
router.post('/assemblyai', upload.single('audio'), transcribeAssemblyAI);

export default router;