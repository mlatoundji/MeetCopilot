let audioContext, processor, input, stream;
const silenceThreshold = 0.01; // RMS threshold
const silenceDuration = 500; // ms
let lastSoundTime = Date.now();
let isUtterance = false;
const logEl = document.getElementById('log');

function log(msg) {
  console.log(msg);
  logEl.textContent += msg + '\n';
  logEl.scrollTop = logEl.scrollHeight;
}

async function start() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    log('Error accessing microphone: ' + err.message);
    return;
  }
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  input = audioContext.createMediaStreamSource(stream);
  processor = audioContext.createScriptProcessor(4096, 1, 1);

  input.connect(processor);
  processor.connect(audioContext.destination);

  processor.onaudioprocess = (e) => {
    const data = e.inputBuffer.getChannelData(0);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    const rms = Math.sqrt(sum / data.length);
    const now = Date.now();

    if (rms >= silenceThreshold) {
      if (!isUtterance) {
        isUtterance = true;
        log('Utterance started');
      }
      lastSoundTime = now;
    } else {
      if (isUtterance && now - lastSoundTime > silenceDuration) {
        isUtterance = false;
        log('Utterance ended');
      }
    }
    log(`RMS: ${rms.toFixed(5)}`);
  };

  log('Streaming started');
  document.getElementById('startBtn').disabled = true;
  document.getElementById('stopBtn').disabled = false;
}

function stop() {
  if (processor) {
    processor.disconnect();
    input.disconnect();
  }
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
  }
  if (audioContext) {
    audioContext.close();
  }
  log('Streaming stopped');
  document.getElementById('startBtn').disabled = false;
  document.getElementById('stopBtn').disabled = true;
}

document.getElementById('startBtn').addEventListener('click', start);
document.getElementById('stopBtn').addEventListener('click', stop); 