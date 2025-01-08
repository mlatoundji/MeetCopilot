import { Blob } from 'buffer';
import fetch from 'node-fetch';

export const transcribeWhisper = async (req, res) => {
  try {
    console.log("Transcribe via Whisper...");
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
    console.log("Transcribe via AssemblyAI...");
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
    const transcriptId = transcript.id;

    let completed = false;

    while (!completed) {
      await new Promise(r => setTimeout(r, 100));
      const statusResp = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          Authorization: process.env.ASSEMBLYAI_API_KEY,
        },
      });

      const statusData = await statusResp.json();
      if (statusData.status === 'completed') {
        completed = true;
        console.log('Transcription completed:', statusData.text);
        return res.json({ transcription: statusData.text });
      } else if (statusData.status === 'failed') {
        console.error('Transcription failed:', statusData.error);
        return res.status(500).json({ error: statusData.error || 'Transcription failed due to an unknown error.' });
      }
      else {
        console.log('Transcription status:', statusData.status);
      }
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};