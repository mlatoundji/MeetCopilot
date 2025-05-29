import express from 'express';
import { addMessages, getConversation } from '../controllers/conversationController.js';
import bodyParser from 'body-parser';
import cbor from 'cbor';

const router = express.Router();

// Fetch full conversation memory
router.get('/:cid', getConversation);

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


export default router; 