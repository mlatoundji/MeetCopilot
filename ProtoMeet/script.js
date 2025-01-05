import { WaveFile } from 'wavefile';


const startBtn = document.getElementById('start-btn');
const transcriptionText = document.getElementById('transcription-text');
let audioContext;
let source;
let recorder;
let buffer = [];

let isRecording = false;

startBtn.addEventListener('click', async () => {
  try {
    if (isRecording) {
        // Arrêter l'enregistrement
        isRecording = false;
        startBtn.textContent = 'Démarrer l\'enregistrement';
        source.disconnect(recorder);
        recorder.disconnect(audioContext.destination);
        recorder.onaudioprocess = null;
        audioContext.close();
        return;
    }
    else {
        isRecording = true;
        startBtn.textContent = 'Arrêter l\'enregistrement';
        // Demander l'accès à l'audio
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        // Créer un contexte audio
        audioContext = new AudioContext();
        // Créer une source audio
        source = audioContext.createMediaStreamSource(stream);
        // Créer un processeur audio
        recorder = audioContext.createScriptProcessor(4096, 1, 1);
        // Connecter la source à l'enregistreur
        source.connect(recorder);
        // Connecter l'enregistreur à la destination
        recorder.connect(audioContext.destination);
        // Démarrer l'enregistrement
        recorder.onaudioprocess = (event) => {
          const audioData = event.inputBuffer.getChannelData(0);
          buffer.push(new Float32Array(audioData));
    }
    };
    // Démarrer la transcription
    startTranscription();
  } catch (error) {
    console.error('Erreur de démarrage de l\'enregistrement', error);
  }
});



function startTranscription() {
  // Envoie les données audio capturées à l'API Whisper pour la transcription
  async function transcribeAudio() {
    if (buffer.length > 0) {
      const audioBuffer = buffer.reduce((acc, val) => {
        const tmp = new Float32Array(acc.length + val.length);
        tmp.set(acc, 0);
        tmp.set(val, acc.length);
        return tmp;
      }, new Float32Array());

      
      buffer = [];
      
      // Convertir le buffer audio en Blob
    //   const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
    //   downloadBlob(audioBlob, 'audio.wav');

         // Convertir le buffer audio en fichier WAV
        //  const wav = new WaveFile();
        //  wav.fromScratch(1, audioContext.sampleRate, '32f', audioBuffer);
        //  const wavBlob = new Blob([wav.toBuffer()], { type: 'audio/wav' });
        // downloadBlob(wavBlob, 'audio.wav');

        // const wavBlob = encodeWAV(audioBuffer, audioContext.sampleRate);
        const wavBlob = bufferToWaveBlob(audioBuffer, audioContext.sampleRate);


      // Créer un FormData et y ajouter le Blob
      const formData = new FormData();
      formData.append('file', wavBlob, 'audio.wav');
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'json');
      formData.append('temperature', '0');

      // Envoie la requête à l'API Whisper
      try {
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer API_KEY',
          },
          body: formData,
        });
        const data = await response.json();
        // Afficher la transcription dans le champ de texte
        transcriptionText.value = data.text;
      } catch (error) {
        console.error('Erreur de transcription', error);
      }
    }
  }
  // Appel répétitif pour la transcription en temps réel
  setInterval(transcribeAudio, 5000);
}

function bufferToWaveBlob(audioBuffer, sampleRate) {
    // On crée une instance WaveFile
    const wav = new WaveFile();
    // On y injecte nos données brutes (32 bits float, mono)
    wav.fromScratch(1, sampleRate, '32f', audioBuffer);
  
    // On récupère ensuite un Blob WAV valide
    const wavBlob = new Blob([wav.toBuffer()], { type: 'audio/wav' });
    return wavBlob;
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

  //Solution alternative pour convertir un buffer audio en fichier WAV
  function encodeWAV(samples, sampleRate) {
    // Nombre d’échantillons
    const numSamples = samples.length;
  
    // Taille du fichier = entête WAV (44 octets) + échantillons (32 bits float = 4 octets par échantillon)
    const buffer = new ArrayBuffer(44 + numSamples * 4);
    const view = new DataView(buffer);
  
    // Écriture du "RIFF chunk descriptor"
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 4, true);
    writeString(view, 8, 'WAVE');
  
    // Format sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 pour PCM)
    view.setUint16(20, 3, true);  // AudioFormat = 3 => FLOAT
    view.setUint16(22, 1, true);  // NumChannels = 1
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 4, true); // ByteRate = SampleRate * NumChannels * BytesPerSample
    view.setUint16(32, 4, true);  // BlockAlign = NumChannels * BytesPerSample
    view.setUint16(34, 32, true); // BitsPerSample = 32 (float)
  
    // Data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, numSamples * 4, true);
  
    // Copie des échantillons
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      view.setFloat32(offset, samples[i], true);
      offset += 4;
    }
  
    return new Blob([buffer], { type: 'audio/wav' });
  }

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }