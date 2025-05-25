import express from 'express';
const router = express.Router();

// Dummy chatbot endpoint
router.post('/message', (req, res) => {
  const { question } = req.body;
  // Return a simple dummy response for now
  res.json({ response: `This is a dummy response to: ${question}` });
});

export default router; 