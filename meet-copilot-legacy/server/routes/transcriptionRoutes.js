import express from 'express';
import multer from 'multer';
import { transcribeWhisper } from '../controllers/transcriptionController.js';
import { transcribeAssemblyAI } from '../controllers/transcriptionController.js';

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // Limit file size to 10MB
    fileFilter: (req, file, cb) => {
      // Accept only audio files
      if (file.mimetype && file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only audio files are allowed.'), false);
      }
    },
  });

// Routes
router.post('/whisper', upload.single('audio'), transcribeWhisper);
router.post('/assemblyai', upload.single('audio'), transcribeAssemblyAI);

export default router;