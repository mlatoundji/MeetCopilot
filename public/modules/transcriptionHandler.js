import { callApi } from '../utils.js';

/**
 * Handles sending audio data for transcription and receiving the results.
 */

export class TranscriptionHandler {
  constructor(transcriptionApiUrl) {
    this.transcriptionApiUrl = transcriptionApiUrl;
    this.model = 'whisper-1';
    this.language = 'fr';
    this.mimeType = 'audio/wav';
    this.fileName = 'audio.wav';
  }

  async applyTranslation(langCode) {
    this.language = langCode;
  }

  /**
   * Sends audio data to the transcription API.
   * @param {Blob} audioBlob - The audio data to be transcribed.
   * @param {string} langCode - The language code for transcription.
   * @param {string} model - The transcription model to use.
   * @returns {Promise<string>} - The transcribed text.
   */
  async transcribeAudio(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('langCode', this.language);
    formData.append('model', this.model);
    formData.append('mimeType', this.mimeType);
    formData.append('fileName', this.fileName);

    try {
      const response = await callApi(this.transcriptionApiUrl, {
        method: 'POST',
        body: formData,
      });
      return response.transcription || '';
    } catch (error) {
      console.error('Error during transcription:', error);
      return '';
    }
  }

  /**
   * Converts a Float32Array buffer to a WAV Blob.
   * @param {Float32Array} audioBuffer - The audio buffer.
   * @param {number} sampleRate - The sample rate of the audio.
   * @returns {Blob} - The WAV Blob.
   */
  bufferToWaveBlob(audioBuffer, sampleRate) {
    const wavBuffer = this._encodeWav(audioBuffer, sampleRate);
    return new Blob([wavBuffer], { type: this.mimeType });
  }

  /**
   * Encodes a Float32Array to WAV format.
   * @private
   * @param {Float32Array} samples - The audio samples.
   * @param {number} sampleRate - The sample rate.
   * @returns {ArrayBuffer} - The WAV file ArrayBuffer.
   */
  _encodeWav(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // RIFF header
    this._writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    this._writeString(view, 8, 'WAVE');
    this._writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    this._writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // PCM samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return buffer;
  }

  /**
   * Writes a string to the DataView.
   * @private
   * @param {DataView} view - The DataView to write to.
   * @param {number} offset - The byte offset.
   * @param {string} string - The string to write.
   */
  _writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
