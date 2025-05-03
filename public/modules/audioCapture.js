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
      try {
        if (!this.isSystemRecording) {
          this.systemMediaStream = await this.getSystemAudioMedia();
          
          if (!this.systemMediaStream) {
            console.log('User cancelled screen capture');
            return false;
          }

          // Ajouter un gestionnaire pour la fin de la capture
          this.systemMediaStream.getVideoTracks()[0].onended = () => {
            console.log('Screen capture ended by user');
            this.stopSystemCapture();
          };

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
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error in startSystemCapture:', error);
        if (error.name === 'NotAllowedError') {
          console.error('Permission denied for screen capture');
        } else if (error.name === 'NotFoundError') {
          console.error('No screen capture source found');
        } else if (error.name === 'NotReadableError') {
          console.error('Screen capture source is not readable');
        }
        return false;
      }
    }
  
    stopSystemCapture() {
      if (this.isSystemRecording) {
        this.systemMediaStream?.getTracks().forEach((track) => track.stop());
        if (this.systemAudioContext) {
          this.systemAudioContext.close();
        }
        this.isSystemRecording = false;
        this.systemBuffer = [];
        this.systemMediaStream = null;
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
        if (this.micAudioContext) {
          this.micAudioContext.close();
        }
        this.isMicRecording = false;
        this.micBuffer = [];
        this.micMediaStream = null;
      }
    }
  }
  