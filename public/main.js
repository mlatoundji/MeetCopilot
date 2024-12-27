// main.js
// Gère le WebSocket, l'AudioContext + AudioWorklet, convertit Float32->Int16 et envoie à NodeJS

let ws = null;
let audioContext = null;
let workletNode = null;
let currentStream = null;
let transcriptionDiv;

window.addEventListener('DOMContentLoaded', () => {
  transcriptionDiv = document.getElementById('transcription');

  const startMicBtn = document.getElementById('startMic');
  const stopMicBtn = document.getElementById('stopMic');
  const startSystemBtn = document.getElementById('startSystem');
  const stopSystemBtn = document.getElementById('stopSystem');

  startMicBtn.onclick = () => startCapture('mic');
  stopMicBtn.onclick = stopCapture;
  startSystemBtn.onclick = () => startCapture('system');
  stopSystemBtn.onclick = stopCapture;
});

async function startCapture(mode) {
  if (audioContext) {
    console.warn('Already capturing audio');
    return;
  }
  // 1) Ouvrir la WS
  ws = new WebSocket(`ws://localhost:3000/transcribe`);
  ws.onopen = () => {
    console.log('WS opened, capturing:', mode);
  };
  ws.onerror = (err) => {
    console.error('WS error:', err);
  };
  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.transcript) {
      const text = data.isFinal ? '(final) ' : '(partial) ';
      transcriptionDiv.innerText += `\n${text}${data.transcript}`;
    } else if (data.error) {
      console.error('Backend error:', data.error);
    }
  };
  ws.onclose = () => {
    console.log('WS closed');
  };

  // 2) getUserMedia ou getDisplayMedia
  let stream;
  try {
    if (mode === 'system') {
      // Capture audio système (l'utilisateur doit partager un onglet/fenêtre et cocher "Share audio")
      stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
    } else {
      // micro
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
  } catch (err) {
    console.error('Error capturing audio:', err);
    return;
  }
  currentStream = stream;

  // 3) Créer un AudioContext à 16 kHz
  audioContext = new AudioContext({ sampleRate: 16000 });
  await audioContext.audioWorklet.addModule('./recorderWorklet.js');

  // 4) Créer le node
  workletNode = new AudioWorkletNode(audioContext, 'pcm-recorder-processor');

  // 5) À chaque buffer Float32, on le convertit en Int16, on l'envoie
  workletNode.port.onmessage = (event) => {
    const float32Array = event.data;
    const int16Array = float32ToInt16(float32Array);
    const base64data = arrayBufferToBase64(int16Array.buffer);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ audio_data: base64data }));
    }
  };

  // 6) Connecter la source
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(workletNode).connect(audioContext.destination);

  console.log('Capture started:', mode);
}

function stopCapture() {
  if (workletNode) {
    workletNode.disconnect();
    workletNode = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  if (currentStream) {
    currentStream.getTracks().forEach(t => t.stop());
    currentStream = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  transcriptionDiv.innerText += '\n[Stopped]';
  console.log('Capture stopped');
}

// -- Fonctions utilitaires --

function float32ToInt16(float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
