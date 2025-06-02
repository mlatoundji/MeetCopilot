// UI elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');

let socket;
let audioContext;
let processor;
let stream;

// Utility to append to log
function log(msg) {
  logEl.textContent += msg + '\n';
  logEl.scrollTop = logEl.scrollHeight;
}

// Convert Float32 PCM to 16-bit PCM
function floatTo16BitPCM(float32Array) {
  const int16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16;
}

// Start capturing audio and sending to WebSocket
async function startAudioStreaming() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    statusEl.textContent = 'Error';
    log('Microphone error: ' + err.message);
    return;
  }
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(stream);
  processor = audioContext.createScriptProcessor(4096, 1, 1);
  source.connect(processor);
  processor.connect(audioContext.destination);

  processor.onaudioprocess = (e) => {
    const data = e.inputBuffer.getChannelData(0);
    const pcm16 = floatTo16BitPCM(data);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(pcm16.buffer);
    }
  };

  log('Audio capture started');
  startBtn.disabled = true;
  stopBtn.disabled = false;
}

// Fetch temporary token before WebSocket connect
async function getTempToken() {
  // Fetch token from local proxy server (avoid CORS issues)
  const resp = await fetch('http://localhost:3001/token', {
    method: 'POST'
  });
  if (!resp.ok) throw new Error(`Token request failed: ${resp.status}`);
  const data = await resp.json();
  return data.token;
}

// Establish WebSocket connection and wire events
async function startStreaming() {
  // Connect to local proxy instead of AssemblyAI directly
  const PROXY_WS_URL = 'ws://localhost:3002/ws';
  statusEl.textContent = 'Connecting to proxy...';
  log('Opening proxy WebSocket...');
  socket = new WebSocket(PROXY_WS_URL);
  socket.binaryType = 'arraybuffer';

  socket.onopen = () => {
    statusEl.textContent = 'Connected';
    log('Proxy WebSocket opened');
    startAudioStreaming();
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.message_type === 'SessionStarted') return; // ignore proxy init
      if (msg.message_type === 'PartialTranscript') {
        log(msg.text);
      } else if (msg.message_type === 'FinalTranscript') {
        log('\n' + msg.text);
      }
    } catch (err) {
      log('Message parse error: ' + err.message);
    }
  };

  socket.onerror = (err) => {
    statusEl.textContent = 'Error';
    log('WebSocket error: ' + (err.message || ''));
  };

  socket.onclose = (event) => {
    statusEl.textContent = 'Closed';
    log(`WebSocket closed (code=${event.code}): ${event.reason}`);
    if (event.code === 4003) {
      log('Free-tier users must upgrade account (error 4003: free tier)');
    }
  };
}

// Stop streaming and clean up
function stopStreaming() {
  if (processor) processor.disconnect();
  if (audioContext) audioContext.close();
  if (stream) stream.getTracks().forEach((t) => t.stop());
  if (socket) socket.close();

  statusEl.textContent = 'Stopped';
  log('Streaming stopped');
  startBtn.disabled = false;
  stopBtn.disabled = true;
}

// Bind UI events
startBtn.addEventListener('click', startStreaming);
stopBtn.addEventListener('click', stopStreaming); 