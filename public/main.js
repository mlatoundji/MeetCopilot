// main.js
// Capture audio (micro ou system), chunk, encodage base64, envoi WS

let ws = null;
let mediaRecorder = null;
let transcriptionDiv = null;

window.addEventListener('DOMContentLoaded', () => {
  transcriptionDiv = document.getElementById("transcription");

  const startMicBtn = document.getElementById("startMic");
  const stopMicBtn = document.getElementById("stopMic");
  const startSystemBtn = document.getElementById("startSystem");
  const stopSystemBtn = document.getElementById("stopSystem");

  startMicBtn.onclick = () => startCapture({ audio: true, video: false }, "mic");
  stopMicBtn.onclick = () => stopCapture();
  startSystemBtn.onclick = () => startCapture({ audio: true, video: true }, "system");
  stopSystemBtn.onclick = () => stopCapture();
});

async function startCapture(constraints, mode) {
  if (mediaRecorder) {
    console.warn("Already recording!");
    return;
  }
  // 1) Ouvrir la WS
  ws = new WebSocket(`ws://localhost:3000/transcribe`);
  ws.onopen = () => {
    console.log("WS open, start recording:", mode);
  };
  ws.onerror = (err) => {
    console.error("WS error:", err);
  };
  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.transcript) {
      const text = data.isFinal ? "(final) " : "(partial) ";
      transcriptionDiv.innerText += `\n${text}${data.transcript}`;
    } else if (data.error) {
      console.error("Backend error:", data.error);
    }
  };
  ws.onclose = () => console.log("WS closed");

  // 2) getUserMedia ou getDisplayMedia
  let stream;
  try {
    if (mode === "system") {
      // L'utilisateur doit sélectionner la fenêtre/onglet et cocher "Share Audio"
      stream = await navigator.mediaDevices.getDisplayMedia(constraints);
    } else {
      // micro
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    }
  } catch (err) {
    console.error("getUserMedia/getDisplayMedia error:", err);
    return;
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 3) MediaRecorder (webm/Opus)
  mediaRecorder = new MediaRecorder(stream, {
    mimeType: "audio/webm; codecs=opus"
  });

  mediaRecorder.ondataavailable = (e) => {
    console.log("Data available event triggered");
    if (e.data && e.data.size > 0) {
      console.log("Audio data size:", e.data.size);
      // downloadBlob(e.data, `chunk-${Date.now()}.webm`);

      if (ws && ws.readyState === WebSocket.OPEN) {
        console.log("WebSocket is open, sending data");
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = btoa(reader.result);
          console.log("Base64 audio data:", base64data);
          // On envoie { audio_data: base64 }
          ws.send(JSON.stringify({ audio_data: base64data }));
        };
        reader.readAsBinaryString(e.data);
      } else {
        console.log("WebSocket is not open");
      }
    } else {
      console.log("No audio data available");
    }
  };
  
  // Envoi d'un chunk toutes les 500ms
  mediaRecorder.start(2000);
  
  console.log(mode, "capture started");
}

function stopCapture() {
  if (mediaRecorder) {
    mediaRecorder.stop();
    mediaRecorder = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  transcriptionDiv.innerText += "\n[Stopped]";
  console.log("Stopped capture");
}
