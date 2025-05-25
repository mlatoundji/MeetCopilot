import express from 'express';
import { fetchChatHistory, addChatHistory } from '../controllers/chatbotController.js';
const router = express.Router();

// Dummy chatbot endpoint
router.post('/message', (req, res) => {
  const { question } = req.body;
  // Return a simple dummy response for now
  res.json({ response: `This is a dummy response to: ${question}` });
});

// Streaming endpoint for chatbot messages via Server-Sent Events (SSE)
router.get('/message/stream', (req, res) => {
  const { question } = req.query;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  // Prepare dummy streaming response, sending one word at a time
  const message = `This is a streaming dummy response to: ${question}`;
  const words = message.split(' ');
  let idx = 0;
  const interval = setInterval(() => {
    if (idx < words.length) {
      res.write(`data: ${words[idx]} \n\n`);
      idx++;
    } else {
      res.write('data: [DONE]\n\n');
      clearInterval(interval);
      res.end();
    }
  }, 200);
});

// Dummy streaming POST endpoint for chatbot messages
router.post('/message/stream', express.json(), (req, res) => {
  const { question } = req.body;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  // Prepare dummy streaming response, sending one word at a time
  const message = `This is a streaming dummy response to: ${question}`;
  const words = message.split(' ');
  let idx = 0;
  const interval = setInterval(() => {
    if (idx < words.length) {
      res.write(`data: ${words[idx]} \n\n`);
      idx++;
    } else {
      res.write('data: [DONE]\n\n');
      clearInterval(interval);
      res.end();
    }
  }, 200);
});

// Chat history persistence
router.get('/history/:sessionId', fetchChatHistory);
router.post('/history/:sessionId', express.json(), addChatHistory);

export default router; 