import express from 'express';
import { fetchChatHistory, addChatHistory, supabase, clearChatSession, handleChatAttachments } from '../controllers/chatbotController.js';
import multer from 'multer';
import { chatCompletion as mistralChatCompletion, streamChatCompletion as mistralStreamChatCompletion, analyzeImage as mistralAnalyzeImage } from '../services/mistralService.js';
import { buildAssistantImageAnalysisPrompt, buildChatbotMessages } from '../services/promptBuilder.js';
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// Handle chat messages with optional attachments
router.post('/message', upload.array('attachments'), async (req, res) => {
  const { question, model, contextSnippet, sessionId } = req.body;
  const files = req.files || [];

  // Handle attachments upload and metadata with controller
  let uploadedUrls = [];
  try {
    uploadedUrls = await handleChatAttachments(sessionId, files);
  } catch (attachmentErr) {
    console.error('Attachment handling error', attachmentErr);
    return res.status(500).json({ error: 'File upload failed' });
  }

  // Build AI prompt
  // 1. Fetch existing chat history
  let history = [];
  try {
    const { data: pastMessages, error: histErr } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (!histErr) history = pastMessages;
  } catch (_) {}
  // 2 & 3. Build messages and call AI depending on selected model
  let assistantMsg;
  if (model === 'pixtral-12b-latest') {
    console.log('Pixtral model selected');
    // Pixtral multimodal model: include base64 images directly
    const pixMessages = [];
    history.forEach(m => pixMessages.push({ role: m.role, content: m.content }));
    if (contextSnippet) pixMessages.push({ role: 'system', content: `Context: ${contextSnippet}` });
    for (const file of files) {
      if (file.mimetype.startsWith('image/')) {
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        const promptMsgs = buildAssistantImageAnalysisPrompt(base64);
        promptMsgs.forEach(pm => pixMessages.push(pm));
      }
    }
    if (question) pixMessages.push({ role: 'user', content: question });
    console.log('Pix messages:', pixMessages);
    try {
      let response = await mistralAnalyzeImage(pixMessages, { model });
      const data = await response.json();
      // Extract assistant message content
      assistantMsg = data.choices?.[0]?.message || '';
    } catch (aiErr) {
      console.error('AI chat completion error', aiErr);
      return res.status(500).json({ error: 'AI completion failed' });
    }
  } else {
      // Generate text descriptions for any image attachments
  const attachmentDescriptions = [];
  for (const file of files) {
    if (file.mimetype.startsWith('image/')) {
      try {
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        const promptMsgs = buildAssistantImageAnalysisPrompt(base64);
        const imgResp = await mistralAnalyzeImage(promptMsgs);
        const imgData = await imgResp.json();
        const desc = imgData.choices?.[0]?.message?.content || imgData.description || '';
        attachmentDescriptions.push(`${file.originalname}: ${desc}`);
      } catch (imgErr) {
        console.error('Image analysis error', imgErr);
      }
      }
    }
    const messages = buildChatbotMessages(history, question, contextSnippet, uploadedUrls, attachmentDescriptions);
    try {
      assistantMsg = await mistralChatCompletion(messages, { model: model || 'mistral-medium' });
    } catch (aiErr) {
      console.error('AI chat completion error', aiErr);
      return res.status(500).json({ error: 'AI completion failed' });
    }
  }
  // 4. Persist assistant response
  try {
    await supabase.from('chat_messages').insert([{ session_id: sessionId, role: 'assistant', content: assistantMsg.content }]);
  } catch (persistErr) {
    console.error('Persist assistant history error', persistErr);
  }
  // 5. Return full response
  return res.json({ uploaded: uploadedUrls, response: assistantMsg.content });
});

// Streaming endpoint for chatbot messages via SSE backed by AI streaming
router.get('/message/stream', async (req, res) => {
  const { question, model, contextSnippet, sessionId } = req.query;
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.flushHeaders();
  // 1) Fetch existing chat history
  let history = [];
  try {
    const { data: pastMessages, error: histErr } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (!histErr) history = pastMessages;
  } catch (_) {}
  // 1b) Fetch any attachments for context
  let attachmentsList = [];
  try {
    const { data: attachRows, error: attachErr } = await supabase
      .from('chat_attachments')
      .select('file_url')
      .eq('session_id', sessionId);
    if (!attachErr && attachRows) attachmentsList = attachRows.map(a => a.file_url);
  } catch (_) {}
  // 2) Build prompt messages
  const messages = buildChatbotMessages(history, question, contextSnippet, uploadedUrls);
  // 3) Call AI streaming
  let assistantFull = '';
  try {
    const aiStream = await mistralStreamChatCompletion(messages, { model: model || 'mistral-medium' });
    aiStream.on('data', (chunk) => {
      const str = chunk.toString();
      // SSE parts come as 'data: <json>' separated by double newlines
      str.split(/\r?\n\r?\n/).forEach(part => {
        if (!part.startsWith('data:')) return;
        const payload = part.replace(/^data:\s*/, '');
        if (payload === '[DONE]') return;
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            assistantFull += delta;
            res.write(`data: ${delta}\n\n`);
          }
        } catch (e) {
          console.error('Error parsing SSE chunk', e);
        }
      });
    });
    aiStream.on('end', async () => {
      // Persist full assistant response
      try {
        await supabase.from('chat_messages').insert([{ session_id: sessionId, role: 'assistant', content: assistantFull.trim() }]);
      } catch (err) {
        console.error('Persist assistant history error', err);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    });
    aiStream.on('error', (err) => {
      console.error('AI stream error', err);
      res.end();
    });
  } catch (err) {
    console.error('Streaming setup error', err);
    res.end();
  }
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
// Clear session (delete messages and attachments)
router.delete('/session/:sessionId', clearChatSession);

export default router; 