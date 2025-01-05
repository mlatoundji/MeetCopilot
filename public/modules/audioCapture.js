/**
 * Handles audio capture from the system and microphone.
 */

export class AudioCapture {
    constructor() {
      this.systemMediaStream = null;
      this.micMediaStream = null;
      this.systemAudioContext = null;
      this.micAudioContext = null;
      this.systemRecorder = null;
      this.micRecorder = null;
      this.systemBuffer = [];
      this.micBuffer = [];
      this.isSystemRecording = false;
      this.isMicRecording = false;
      this.timeslice = 4000; // Time slice for audio chunks in milliseconds
    }
  
    async getSystemAudioMedia() {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: true,
        });
        return stream;
      } catch (err) {
        console.error("Error in getSystemAudioMedia:", err);
        return null;
      }
    }
  
    async getMicMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        return stream;
      } catch (err) {
        console.error("Error in getMicMedia:", err);
        return null;
      }
    }
  
    async startSystemCapture() {
      if (!this.isSystemRecording) {
        this.systemMediaStream = await this.getSystemAudioMedia();
        if (this.systemMediaStream) {
          this.systemAudioContext = new AudioContext();
          const source = this.systemAudioContext.createMediaStreamSource(this.systemMediaStream);
          this.systemRecorder = this.systemAudioContext.createScriptProcessor(4096, 1, 1);
  
          source.connect(this.systemRecorder);
          this.systemRecorder.connect(this.systemAudioContext.destination);
  
          this.systemRecorder.onaudioprocess = (event) => {
            const audioData = event.inputBuffer.getChannelData(0);
            this.systemBuffer.push(new Float32Array(audioData));
          };
  
          this.isSystemRecording = true;
        }
      }
    }
  
    stopSystemCapture() {
      if (this.isSystemRecording) {
        this.systemMediaStream?.getTracks().forEach((track) => track.stop());
        this.systemAudioContext.close();
        this.isSystemRecording = false;
        this.systemBuffer = [];
      }
    }
  
    async startMicCapture() {
      if (!this.isMicRecording) {
        this.micMediaStream = await this.getMicMedia();
        if (this.micMediaStream) {
          this.micAudioContext = new AudioContext();
          const source = this.micAudioContext.createMediaStreamSource(this.micMediaStream);
          this.micRecorder = this.micAudioContext.createScriptProcessor(4096, 1, 1);
  
          source.connect(this.micRecorder);
          this.micRecorder.connect(this.micAudioContext.destination);
  
          this.micRecorder.onaudioprocess = (event) => {
            const audioData = event.inputBuffer.getChannelData(0);
            this.micBuffer.push(new Float32Array(audioData));
          };
  
          this.isMicRecording = true;
        }
      }
    }
  
    stopMicCapture() {
      if (this.isMicRecording) {
        this.micMediaStream?.getTracks().forEach((track) => track.stop());
        this.micAudioContext.close();
        this.isMicRecording = false;
        this.micBuffer = [];
      }
    }
  }
  