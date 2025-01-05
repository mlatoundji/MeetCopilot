import { generateSummary } from '../../../server/controllers/summaryController.js';
import fetch from 'node-fetch';
import { jest } from '@jest/globals';

jest.mock('node-fetch');

describe('generateSummary', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {
        context: 'This is a test context for the summary.',
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should generate a summary successfully', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'This is a summary.' } }],
      }),
    };
    fetch.mockResolvedValue(mockResponse);

    await generateSummary(req, res);

    expect(fetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', expect.any(Object));
    expect(res.json).toHaveBeenCalledWith({ summary: 'This is a summary.' });
  });

  it('should handle API error response', async () => {
    const mockResponse = {
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({ error: 'Bad Request' }),
    };
    fetch.mockResolvedValue(mockResponse);

    await generateSummary(req, res);

    expect(fetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: { error: 'Bad Request' } });
  });

  it('should handle exceptions', async () => {
    fetch.mockRejectedValue(new Error('Internal Server Error'));

    await generateSummary(req, res);

    expect(fetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });
});