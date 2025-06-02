import { generateSummary } from '../controllers/summaryController.js';
import fetch from 'node-fetch';
// Mock getCachedSummary and setCachedSummary from cache.js
import { getCachedSummary, setCachedSummary } from '../utils/cache.js';

jest.mock('node-fetch');
jest.mock('../utils/cache.js', () => ({
  getCachedSummary: jest.fn(),
  setCachedSummary: jest.fn(),
}));

describe('generateSummary', () => {
  let req, res;

  beforeEach(() => {
    req = { body: { context: 'This is a test context for the summary.' } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    // Reset mocks before each test
    fetch.mockClear();
    getCachedSummary.mockClear();
    setCachedSummary.mockClear();
  });

  // afterEach(() => {
  //   jest.clearAllMocks(); // Can be too broad, prefer targeted clears
  // });

  it('should generate a summary successfully when cache is empty', async () => {
    getCachedSummary.mockReturnValue(null); // Ensure cache miss
    const mockMessage = { role: 'assistant', content: 'This is a summary.' };
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ choices: [{ message: mockMessage }] }),
    };
    fetch.mockResolvedValue(mockResponse);

    await generateSummary(req, res);

    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.any(Object)
    );
    expect(res.json).toHaveBeenCalledWith({ summary: mockMessage });
    expect(setCachedSummary).toHaveBeenCalled(); // Verify it tries to cache
  });

  it('should return cached summary if available', async () => {
    const cachedMockMessage = { role: 'assistant', content: 'This is a cached summary.' };
    getCachedSummary.mockReturnValue(cachedMockMessage);

    await generateSummary(req, res);

    expect(fetch).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ summary: cachedMockMessage });
    expect(setCachedSummary).not.toHaveBeenCalled();
  });


  it('should handle API error response', async () => {
    getCachedSummary.mockReturnValue(null); // Ensure cache miss
    const mockResponse = {
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({ error: 'Bad Request' }),
      // For non-ok responses, node-fetch might throw or expose text()
      text: jest.fn().mockResolvedValue(JSON.stringify({ error: 'Bad Request' })) 
    };
    fetch.mockResolvedValue(mockResponse);

    await generateSummary(req, res);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500); // Controller catches and returns 500
    // The controller does not directly pass the API's error.json() through.
    // It logs the error and returns a generic 'Internal Server Error' or specific error from service.
    // Based on openaiService.js, it throws new Error(`API request failed...`)
    // which summaryController catches and returns 500 { error: 'Internal Server Error' }
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });

  it('should handle exceptions during fetch', async () => {
    getCachedSummary.mockReturnValue(null); // Ensure cache miss
    fetch.mockRejectedValue(new Error('Network Error'));

    await generateSummary(req, res);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });
}); 