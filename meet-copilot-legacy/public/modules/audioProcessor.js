class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channelData = inputs[0][0];
    if (channelData && channelData.length > 0) {
      // Transfer raw float audio data to main thread
      this.port.postMessage(channelData);
    }
    return true; // Keep processor alive
  }
}

registerProcessor('pcm-processor', PCMProcessor); 