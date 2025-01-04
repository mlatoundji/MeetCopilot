// Importez les bibliothèques nécessaires
const OpenAI = require('openai');

// Créez une instance de l'API OpenAI avec votre clé d'API
const openai = new OpenAI({
  apiKey: 'votre_clé_d_api',
});

// Configurez le point de terminaison pour l'API Whisper
const endpoint = 'votre_point_de_terminaison';

// Utilisez la Web Audio API pour capturer le son en temps réel
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const recorder = audioContext.createScriptProcessor(4096, 1, 1);

    source.connect(recorder);
    recorder.connect(audioContext.destination);

    let buffer = [];

    recorder.onaudioprocess = (event) => {
      const audioData = event.inputBuffer.getChannelData(0);
      buffer.push(audioData);
    };

    // Envoie les données audio capturées à l'API Whisper pour la transcription
    function transcribeAudio() {
      if (buffer.length > 0) {
        const audioBuffer = buffer.join('');
        buffer = [];

        openai.audio.transcriptions.create({
          model: 'whisper-1',
          file: audioBuffer,
          response_format: 'json',
          temperature: 0,
        })
        .then(response => {
          console.log('Transcription:', response.text);
        })
        .catch(error => {
          console.error('Erreur de transcription:', error);
        });
      }
    }

    // Appel répétitif pour la transcription en temps réel
    setInterval(transcribeAudio, 1000);
  })
  .catch(error => {
    console.error('Erreur de capture audio:', error);
  });