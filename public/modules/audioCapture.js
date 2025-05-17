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
      
      // Buffer management settings
      this.maxBufferSize = 1000; // Maximum number of chunks to store
      this.bufferCleanupInterval = 30000; // Cleanup every 30 seconds
      this.bufferCleanupTimer = null;
    }

    // Helper method to manage buffer size
    manageBuffer(buffer, newData) {
      buffer.push(newData);
      if (buffer.length > this.maxBufferSize) {
        // Remove oldest entries to maintain max size
        const excess = buffer.length - this.maxBufferSize;
        buffer.splice(0, excess);
      }
    }

    // Start periodic buffer cleanup
    startBufferCleanup() {
      if (!this.bufferCleanupTimer) {
        this.bufferCleanupTimer = setInterval(() => {
          this.processAndClearBuffers();
        }, this.bufferCleanupInterval);
      }
    }

    // Stop periodic buffer cleanup
    stopBufferCleanup() {
      if (this.bufferCleanupTimer) {
        clearInterval(this.bufferCleanupTimer);
        this.bufferCleanupTimer = null;
      }
    }

    // Process and clear buffers
    processAndClearBuffers() {
      // Process system buffer if needed
      if (this.systemBuffer.length > 0) {
        // Here you can add logic to process the buffer data
        // For example, send it to a server or save it
        console.log(`Processing ${this.systemBuffer.length} system audio chunks`);
        this.systemBuffer = [];
      }

      // Process mic buffer if needed
      if (this.micBuffer.length > 0) {
        // Here you can add logic to process the buffer data
        console.log(`Processing ${this.micBuffer.length} mic audio chunks`);
        this.micBuffer = [];
      }
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
            this.manageBuffer(this.systemBuffer, new Float32Array(audioData));
          };
  
          this.isSystemRecording = true;
          this.startBufferCleanup();
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
        this.processAndClearBuffers();
        this.systemMediaStream = null;
        if (!this.isMicRecording) {
          this.stopBufferCleanup();
        }
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
            this.manageBuffer(this.micBuffer, new Float32Array(audioData));
          };
  
          this.isMicRecording = true;
          this.startBufferCleanup();
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
        this.processAndClearBuffers();
        this.micMediaStream = null;
        if (!this.isSystemRecording) {
          this.stopBufferCleanup();
        }
      }
    }
  }
  