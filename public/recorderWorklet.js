// recorderWorklet.js
// Capture du flux audio brut en Float32, puis on l'envoie au main thread.

class PCMRecorderProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      // On choisit une taille de buffer, ex. 1024
      this.bufferSize = 1024;
      this._buffer = new Float32Array(this.bufferSize);
      this._offset = 0;
    }
  
    process(inputs, outputs) {
      const input = inputs[0];
      if (!input || !input[0]) return true;
      const samples = input[0];
  
      for (let i = 0; i < samples.length; i++) {
        this._buffer[this._offset++] = samples[i];
        if (this._offset >= this.bufferSize) {
          // On envoie ce buffer vers le main thread
          this.port.postMessage(this._buffer);
          // On réinitialise
          this._buffer = new Float32Array(this.bufferSize);
          this._offset = 0;
        }
      }
      return true; // continue
    }
  }
  
  registerProcessor('pcm-recorder-processor', PCMRecorderProcessor);
  