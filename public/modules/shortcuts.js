// List of keyboard shortcuts for the meeting page
export const shortcuts = [
  { key: 's', ctrl: true, alt: true, shift: false, method: 'toggleSystemCapture', description: 'Start/Stop System Capture' },
  { key: 'm', ctrl: true, alt: true, shift: false, method: 'toggleMicCapture', description: 'Start/Stop Mic Capture' },
  { key: 'i', ctrl: true, alt: true, shift: false, method: 'captureImage', description: 'Capture Image / Capture d\'écran' },
  { key: 'g', ctrl: true, alt: true, shift: false, method: 'startSuggestionsStreaming', description: 'Generate Suggestions' },
  { key: 'e', ctrl: true, alt: true, shift: false, method: 'saveAndQuitMeeting', description: 'Save & Quit Meeting' },
  { key: 'q', ctrl: true, alt: true, shift: false, method: 'quitMeeting', description: 'Quit Meeting' },
  { key: 'b', ctrl: true, alt: true, shift: false, method: 'toggleSidebar', description: 'Toggle Sidebar / Afficher/Cacher la meeting-sidebar' },
  { key: 'f', ctrl: true, alt: true, shift: false, method: 'toggleFullSidebar', description: 'Toggle Full Sidebar / Basculer en sidebar "plein"' },
  { key: 'p', ctrl: true, alt: true, shift: false, method: 'toggleLayoutPresets', description: 'Open/Close Layout Presets Panel' },
  { key: 't', ctrl: true, alt: true, shift: false, method: 'toggleTranscriptionArea', description: 'Toggle Transcription Area' },
  { key: 'u', ctrl: true, alt: true, shift: false, method: 'toggleSuggestionsArea', description: 'Toggle Suggestions Area' }
]; 