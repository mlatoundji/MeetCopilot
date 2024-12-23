// recorderWorklet.js
class RecorderProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      this.bufferSize = 4096;
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
          // Envoi au main thread
          this.port.postMessage(this._buffer);
          // Reset
          this._buffer = new Float32Array(this.bufferSize);
          this._offset = 0;
        }
      }
      return true; // continue
    }
  }
  
  registerProcessor("recorder-processor", RecorderProcessor);
  