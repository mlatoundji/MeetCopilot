import { getCachedTranscription, setCachedTranscription } from '../utils/cache.js';
import crypto from 'crypto';
import fs from 'fs';

const POLLING_INTERVAL = 1000; // 1 second
const MAX_RETRIES = 3;
const TIMEOUT = 30000; // 30 seconds

const generateAudioHash = (buffer) => {
    return crypto.createHash('md5').update(buffer).digest('hex');
};

const retryWithExponentialBackoff = async (fn, retries = MAX_RETRIES, delay = 1000) => {
    try {
        return await fn();
    } catch (error) {
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryWithExponentialBackoff(fn, retries - 1, delay * 2);
    }
};

export const transcribeWhisper = async (req, res) => {
    try {
        console.log("Transcribe via Whisper...");
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            console.error('OPENAI_API_KEY environment variable is not defined');
            return res.status(500).json({ error: 'Server configuration error: OPENAI_API_KEY not set' });
        }
        const audioHash = generateAudioHash(req.file.buffer);
        
        // Check cache first
        const cachedTranscription = getCachedTranscription(audioHash);
        if (cachedTranscription) {
            console.log("Returning cached transcription");
            return res.json({ transcription: cachedTranscription });
        }

        const mimeType = req.body.mimeType || 'audio/wav';
        const filename = req.body.filename || 'audio.wav';
        const model = req.body.model || 'whisper-1';
        const language = req.body.langCode || 'auto';

        const formData = new FormData();
        // Stream file data directly to avoid loading entire buffer into memory
        let fileStream;
        if (req.file.stream) {
            // If environment provides a stream on the file
            fileStream = req.file.stream();
        } else if (req.file.path) {
            // Use disk storage path to stream file
            fileStream = fs.createReadStream(req.file.path);
        } else {
            throw new Error('Unable to create file stream for transcription');
        }
        formData.append('file', fileStream, { filename, contentType: mimeType });
        formData.append('model', model);
        formData.append('language', language);

        const response = await retryWithExponentialBackoff(async () => {
            const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${openaiKey}`,
                },
                body: formData,
            });
            if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
            return resp;
        });

        const data = await response.json();
        const transcription = data.text;
        
        // Cache the result
        setCachedTranscription(audioHash, transcription);
        
        res.json({ transcription });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const transcribeAssemblyAI = async (req, res) => {
    try {
        console.log("Transcribe via AssemblyAI...");
        const assemblyKey = process.env.ASSEMBLYAI_API_KEY;
        if (!assemblyKey) {
            console.error('ASSEMBLYAI_API_KEY environment variable is not defined');
            return res.status(500).json({ error: 'Server configuration error: ASSEMBLYAI_API_KEY not set' });
        }
        const audioHash = generateAudioHash(req.file.buffer);
        
        // Check cache first
        const cachedTranscription = getCachedTranscription(audioHash);
        if (cachedTranscription) {
            console.log("Returning cached transcription");
            return res.json({ transcription: cachedTranscription });
        }

        const language = req.body.langCode ?? 'auto';

        // Upload with retry
        const uploadResp = await retryWithExponentialBackoff(async () => {
            const resp = await fetch('https://api.assemblyai.com/v2/upload', {
                method: 'POST',
                headers: {
                    Authorization: assemblyKey,
                    'Content-Type': req.file.mimetype || 'application/octet-stream'
                },
                body: req.file.buffer,
            });
            if (!resp.ok) throw new Error(`Upload failed! status: ${resp.status}`);
            return resp;
        });

        const uploadData = await uploadResp.json();

        // Start transcription with retry
        const transcriptResp = await retryWithExponentialBackoff(async () => {
            const resp = await fetch('https://api.assemblyai.com/v2/transcript', {
                method: 'POST',
                headers: {
                    Authorization: assemblyKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    audio_url: uploadData.upload_url,
                    language_code: language,
                    speed_boost: true, // Enable speed boost
                }),
            });
            if (!resp.ok) throw new Error(`Transcription failed! status: ${resp.status}`);
            return resp;
        });

        const transcript = await transcriptResp.json();
        const transcriptId = transcript.id;

        // Poll for results with timeout
        const startTime = Date.now();
        let completed = false;

        while (!completed && (Date.now() - startTime) < TIMEOUT) {
            await new Promise(r => setTimeout(r, POLLING_INTERVAL));
            
            const statusResp = await retryWithExponentialBackoff(async () => {
                const resp = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
                    headers: {
                        Authorization: assemblyKey,
                    },
                });
                if (!resp.ok) throw new Error(`Status check failed! status: ${resp.status}`);
                return resp;
            });

            const statusData = await statusResp.json();
            
            if (statusData.status === 'completed') {
                completed = true;
                console.log('Transcription completed:', statusData.text);
                
                // Cache the result
                setCachedTranscription(audioHash, statusData.text);
                
                return res.json({ transcription: statusData.text });
            } else if (statusData.status === 'failed') {
                console.error('Transcription failed:', statusData.error);
                return res.status(500).json({ error: statusData.error || 'Transcription failed' });
            }
            console.log('Transcription status:', statusData.status);
        }

        if (!completed) {
            throw new Error('Transcription timed out');
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};