export class AudioCaptureWorklet {
  constructor() {
    this.systemMediaStream = null;
    this.micMediaStream = null;
    this.systemAudioContext = null;
    this.micAudioContext = null;
    this.systemProcessorNode = null;
    this.micProcessorNode = null;
    this.systemBuffer = [];
    this.micBuffer = [];
    this.maxBufferSize = 1000;
    this.utteranceThreshold = 0.01;
    this.utteranceSilenceDuration = 500;
    this.utteranceLastSoundTime = { system: Date.now(), mic: Date.now() };
    this.utteranceInProgress = { system: false, mic: false };
    this.onUtteranceStart = null;
    this.onUtteranceEnd = null;
  }

  // Helper to convert Float32 arrays to Int16 PCM and manage buffer size
  manageBuffer(buffer, newData) {
    const pcmData = new Int16Array(newData.length);
    for (let i = 0; i < newData.length; i++) {
      pcmData[i] = Math.max(-1, Math.min(1, newData[i])) * 0x7FFF;
    }
    buffer.push(pcmData);
    if (buffer.length > this.maxBufferSize) {
      buffer.splice(0, buffer.length - this.maxBufferSize);
    }
  }

  // Internal processing and flush on utterance end
  _processBuffers(type) {
    const buffer = type === 'system' ? this.systemBuffer : this.micBuffer;
    if (buffer.length === 0) return;
    // Concatenate Float32 chunks
    const combined = buffer.reduce((acc, val) => {
      const tmp = new Float32Array(acc.length + val.length);
      tmp.set(acc, 0);
      tmp.set(val, acc.length);
      return tmp;
    }, new Float32Array());
    // Clear buffer
    if (type === 'system') this.systemBuffer = [];
    else this.micBuffer = [];
    // Invoke callback
    if (this.onUtteranceEnd) this.onUtteranceEnd(type, combined);
  }

  async startSystemCapture() {
    try {
      if (this.systemAudioContext) return false;
      const stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
      if (!stream) return false;
      this.systemMediaStream = stream;
      // Stop on screen-share end
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].onended = () => this.stopSystemCapture();
      }
      const audioTracks = stream.getAudioTracks();
      const audioStream = new MediaStream(audioTracks);
      this.systemAudioContext = new AudioContext();
      await this.systemAudioContext.audioWorklet.addModule(
        new URL('audioProcessor.js', import.meta.url)
      );
      const source = this.systemAudioContext.createMediaStreamSource(audioStream);
      this.systemProcessorNode = new AudioWorkletNode(this.systemAudioContext, 'pcm-processor');
      source.connect(this.systemProcessorNode);
      this.systemProcessorNode.connect(this.systemAudioContext.destination);
      this.systemProcessorNode.port.onmessage = (event) => {
        const audioData = event.data;
        // Buffer raw Float32 data
        this.systemBuffer.push(new Float32Array(audioData));
        if (this.systemBuffer.length > this.maxBufferSize) {
          this.systemBuffer.splice(0, this.systemBuffer.length - this.maxBufferSize);
        }
        // Silence/utterance detection
        const now = Date.now();
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) sum += audioData[i] * audioData[i];
        const rms = Math.sqrt(sum / audioData.length);
        if (rms >= this.utteranceThreshold) {
          this.utteranceLastSoundTime.system = now;
          if (!this.utteranceInProgress.system) {
            this.utteranceInProgress.system = true;
            if (this.onUtteranceStart) this.onUtteranceStart('system');
          }
        } else if (
          this.utteranceInProgress.system &&
          now - this.utteranceLastSoundTime.system > this.utteranceSilenceDuration
        ) {
          this.utteranceInProgress.system = false;
          this._processBuffers('system');
        }
      };
      return true;
    } catch (error) {
      console.error('Error in startSystemCapture (Worklet):', error);
      return false;
    }
  }

  stopSystemCapture() {
    if (this.systemMediaStream) {
      this.systemMediaStream.getTracks().forEach((t) => t.stop());
    }
    if (this.systemProcessorNode) {
      this.systemProcessorNode.disconnect();
      this.systemProcessorNode = null;
    }
    if (this.systemAudioContext) {
      this.systemAudioContext.close();
      this.systemAudioContext = null;
    }
    this._processBuffers('system');
  }

  async startMicCapture() {
    try {
      if (this.micAudioContext) return false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (!stream) return false;
      this.micMediaStream = stream;
      this.micAudioContext = new AudioContext();
      await this.micAudioContext.audioWorklet.addModule(
        new URL('audioProcessor.js', import.meta.url)
      );
      const source = this.micAudioContext.createMediaStreamSource(stream);
      this.micProcessorNode = new AudioWorkletNode(this.micAudioContext, 'pcm-processor');
      source.connect(this.micProcessorNode);
      this.micProcessorNode.connect(this.micAudioContext.destination);
      this.micProcessorNode.port.onmessage = (event) => {
        const audioData = event.data;
        this.micBuffer.push(new Float32Array(audioData));
        if (this.micBuffer.length > this.maxBufferSize) {
          this.micBuffer.splice(0, this.micBuffer.length - this.maxBufferSize);
        }
        const now = Date.now();
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) sum += audioData[i] * audioData[i];
        const rms = Math.sqrt(sum / audioData.length);
        if (rms >= this.utteranceThreshold) {
          this.utteranceLastSoundTime.mic = now;
          if (!this.utteranceInProgress.mic) {
            this.utteranceInProgress.mic = true;
            if (this.onUtteranceStart) this.onUtteranceStart('mic');
          }
        } else if (
          this.utteranceInProgress.mic &&
          now - this.utteranceLastSoundTime.mic > this.utteranceSilenceDuration
        ) {
          this.utteranceInProgress.mic = false;
          this._processBuffers('mic');
        }
      };
      return true;
    } catch (error) {
      console.error('Error in startMicCapture (Worklet):', error);
      return false;
    }
  }

  stopMicCapture() {
    if (this.micMediaStream) {
      this.micMediaStream.getTracks().forEach((t) => t.stop());
    }
    if (this.micProcessorNode) {
      this.micProcessorNode.disconnect();
      this.micProcessorNode = null;
    }
    if (this.micAudioContext) {
      this.micAudioContext.close();
      this.micAudioContext = null;
    }
    this._processBuffers('mic');
  }
} 