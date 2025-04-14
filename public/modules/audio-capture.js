export class AudioCapture {
  constructor() {
    this.systemMediaStream = null;
    this.isSystemRecording = false;
  }

  async startSystemCapture() {
    try {
      this.systemMediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      // Vérifier si l'utilisateur a annulé la sélection
      if (!this.systemMediaStream) {
        return false;
      }

      this.isSystemRecording = true;
      return true;
    } catch (error) {
      console.error('Error accessing system audio:', error);
      return false;
    }
  }
} 