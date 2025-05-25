import express from 'express';
import { fetchChatHistory, addChatHistory, supabase } from '../controllers/chatbotController.js';
import multer from 'multer';
import { chatCompletion, streamChatCompletion, analyzeImage as mistralAnalyzeImage } from '../services/mistralService.js';
import { buildAssistantImageAnalysisPrompt } from '../services/promptBuilder.js';
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// Handle chat messages with optional attachments
router.post('/message', upload.array('attachments'), async (req, res) => {
  const { question, model, contextSnippet, sessionId } = req.body;
  const files = req.files || [];
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
  const uploadedUrls = [];
  for (const file of files) {
    // build unique path
    const path = `${sessionId}/${Date.now()}_${file.originalname}`;
    // upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(path, file.buffer, { contentType: file.mimetype });
    if (uploadError) {
      console.error('Supabase storage upload error', uploadError.message);
      return res.status(500).json({ error: 'File upload failed' });
    }
    // generate signed URL (private bucket)
    const { data: signedData, error: urlError } = await supabase.storage
      .from('chat-attachments')
      .createSignedUrl(path, 60 * 60); // expires in 1 hour
    if (urlError) {
      console.error('Supabase createSignedUrl error', urlError.message);
      return res.status(500).json({ error: 'URL creation failed' });
    }
    const signedURL = signedData.signedUrl;
    uploadedUrls.push(signedURL);
    // persist attachment metadata
    const { error: dbError } = await supabase.from('chat_attachments').insert([
      { session_id: sessionId, file_url: signedURL, file_name: file.originalname, mime_type: file.mimetype }
    ]);
    if (dbError) {
      console.error('Supabase insert attachment error', dbError.message);
    }
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
  // 2. Build messages array for AI
  const messages = [];
  messages.push({ role: 'system', content: 'You are a helpful AI assistant.' });
  if (contextSnippet) messages.push({ role: 'system', content: `Context: ${contextSnippet}` });
  if (attachmentDescriptions.length > 0) {
    messages.push({ role: 'system', content: `Image descriptions:\n${attachmentDescriptions.join('\n')}` });
  }
  if (uploadedUrls.length > 0) {
    messages.push({ role: 'system', content: `Attached files: ${uploadedUrls.join(', ')}` });
  }
  for (const m of history) messages.push({ role: m.role, content: m.content });
  messages.push({ role: 'user', content: question });
  // 3. Call AI
  let assistantMsg;
  try {
    assistantMsg = await chatCompletion(messages, { model: model || 'mistral-medium' });
  } catch (aiErr) {
    console.error('AI chat completion error', aiErr);
    return res.status(500).json({ error: 'AI completion failed' });
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
  const messages = [];
  messages.push({ role: 'system', content: 'You are a helpful AI assistant.' });
  if (contextSnippet) messages.push({ role: 'system', content: `Context: ${contextSnippet}` });
  if (attachmentsList.length > 0) messages.push({ role: 'system', content: `Attached files: ${attachmentsList.join(', ')}` });
  for (const m of history) messages.push({ role: m.role, content: m.content });
  messages.push({ role: 'user', content: question });
  // 3) Call AI streaming
  let assistantFull = '';
  try {
    const aiStream = await streamChatCompletion(messages, { model: model || 'mistral-medium' });
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

export default router; 