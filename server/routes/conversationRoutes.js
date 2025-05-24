import express from 'express';
import { addMessages, streamConversation } from '../controllers/conversationController.js';
import bodyParser from 'body-parser';
import cbor from 'cbor';

const router = express.Router();

// Support CBOR-encoded delta payloads
router.post('/:cid/messages',
  // Raw parser for CBOR
  bodyParser.raw({ type: 'application/cbor', limit: '1mb' }),
  // Decode CBOR if present, else leave JSON body intact
  (req, res, next) => {
    if (req.is('application/cbor')) {
      try {
        // Decode first CBOR object
        const decoded = cbor.decodeFirstSync(req.body);
        req.body = decoded;
      } catch (err) {
        return res.status(400).json({ error: 'Invalid CBOR payload' });
      }
    }
    next();
  },
  addMessages
);
// Streaming endpoint (SSE)
router.get('/:cid/stream', streamConversation);

export default router; 