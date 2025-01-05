import { Blob } from 'buffer';
import fetch from 'node-fetch';

export const transcribeWhisper = async (req, res) => {
  try {
    const mimeType = req.body.mimeType || 'audio/wav';
    const filename = req.body.filename || 'audio.wav';
    const model = req.body.model || 'whisper-1';
    const language = req.body.langCode || 'fr';

    const formData = new FormData();
    formData.append('file', new Blob([req.file.buffer], { type: mimeType }), filename);
    formData.append('model', model);
    formData.append('language', language);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    res.json({ transcription: data.text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const transcribeAssemblyAI = async (req, res) => {
  try {
    const language = req.body.langCode?? 'fr';
    const uploadResp = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        Authorization: process.env.ASSEMBLYAI_API_KEY,
      },
      body: req.file.buffer,
    });

    const uploadData = await uploadResp.json();
    if (!uploadResp.ok) {
      return res.status(uploadResp.status).json({ error: uploadData });
    }

    const transcriptResp = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        Authorization: process.env.ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: uploadData.upload_url,
        language_code: language,
      }),
    });

    const transcript = await transcriptResp.json();

    if (transcript.status === 'completed') {
      res.json({ transcription: transcript.text });
    } else if (transcript.status === 'processing') {
      res.status(202).json({ message: 'Transcription is still processing. Please try again later.' });
    } else if (transcript.status === 'failed') {
      res.status(500).json({ error: transcript.error || 'Transcription failed due to an unknown error.' });
    } else {
      res.status(400).json({ error: `Unexpected status: ${transcript.status}` });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};