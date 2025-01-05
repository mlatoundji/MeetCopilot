import { filterTranscription } from '../utils.js';

describe('filterTranscription', () => {
  test('should filter out unwanted words', () => {
    const transcription = "This is a test transcription with some unwanted words.";
    const language = "en";
    const result = filterTranscription(transcription, language);
    expect(result).toBe("This is a test transcription with some words.");
  });

  test('should return empty string if transcription is empty', () => {
    const transcription = "";
    const language = "en";
    const result = filterTranscription(transcription, language);
    expect(result).toBe("");
  });

  test('should handle different languages', () => {
    const transcription = "Ceci est une transcription de test avec des mots indésirables.";
    const language = "fr";
    const result = filterTranscription(transcription, language);
    expect(result).toBe("Ceci est une transcription de test avec des mots.");
  });

  // Add more test cases as needed
});