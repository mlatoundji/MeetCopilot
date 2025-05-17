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
      
      // Buffer management settings
      this.maxBufferSize = 1000; // Maximum number of chunks to store
      this.bufferCleanupInterval = 30000; // Cleanup every 30 seconds
      this.bufferCleanupTimer = null;
      // Time slice for MediaRecorder (unused for system, but define default)
      this.timeslice = 1000; // in ms
      // Processor node for system audio capture
      this.systemProcessor = null;
    }

    // Helper method to manage buffer size
    manageBuffer(buffer, newData) {
      // Convert Float32Array to 16-bit PCM
      const pcmData = new Int16Array(newData.length);
      for (let i = 0; i < newData.length; i++) {
        pcmData[i] = Math.max(-1, Math.min(1, newData[i])) * 0x7FFF;
      }
      buffer.push(pcmData);
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
        // TODO: Implement data processing and export functionality
        console.log(`Processing ${this.systemBuffer.length} system audio chunks`);
        // this.systemBuffer = []; // Commented out until processing is implemented
      }

      // Process mic buffer if needed
      if (this.micBuffer.length > 0) {
        // TODO: Implement data processing and export functionality
        console.log(`Processing ${this.micBuffer.length} mic audio chunks`);
        // this.micBuffer = []; // Commented out until processing is implemented
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

          // Check if video tracks exist before accessing the first one
          const videoTracks = this.systemMediaStream.getVideoTracks();
          if (videoTracks.length > 0) {
            videoTracks[0].onended = () => {
              console.log('Screen capture ended by user');
              this.stopSystemCapture();
            };
          }

          // Extract audio tracks and process via AudioContext for PCM buffer
          const audioTracks = this.systemMediaStream.getAudioTracks();
          const audioStream = new MediaStream(audioTracks);
          this.systemAudioContext = new AudioContext();
          const sourceNode = this.systemAudioContext.createMediaStreamSource(audioStream);
          this.systemProcessor = this.systemAudioContext.createScriptProcessor(4096, 1, 1);
          sourceNode.connect(this.systemProcessor);
          this.systemProcessor.connect(this.systemAudioContext.destination);
          this.systemProcessor.onaudioprocess = (event) => {
            const audioData = event.inputBuffer.getChannelData(0);
            // Buffer raw PCM data for transcription
            this.systemBuffer.push(new Float32Array(audioData));
            // Enforce max buffer size
            if (this.systemBuffer.length > this.maxBufferSize) {
              this.systemBuffer.splice(0, this.systemBuffer.length - this.maxBufferSize);
            }
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
        // Stop all media tracks
        this.systemMediaStream?.getTracks().forEach((track) => track.stop());
        // Disconnect audio processor
        if (this.systemProcessor) {
          this.systemProcessor.disconnect();
          this.systemProcessor = null;
        }
        // Close audio context
        if (this.systemAudioContext) {
          this.systemAudioContext.close();
          this.systemAudioContext = null;
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
        try {
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
        } catch (error) {
          console.error('Error in startMicCapture:', error);
          this.isMicRecording = false;
          alert('Microphone permission denied. Please allow access to your microphone to continue.');
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
        // Disconnect and nullify micRecorder
        if (this.micRecorder) {
          this.micRecorder.disconnect();
          this.micRecorder = null;
        }
        // Disconnect and nullify systemRecorder if it exists
        if (this.systemRecorder) {
          this.systemRecorder.disconnect();
          this.systemRecorder = null;
        }
      }
    }
  }
  