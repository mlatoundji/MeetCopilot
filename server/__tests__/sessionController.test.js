import { updateSession } from '../controllers/sessionController.js';
import { extractUserId } from '../utils/extractUserId.js';

jest.mock('../utils/extractUserId.js', () => ({ extractUserId: jest.fn(() => 'user1') }));

describe('sessionController.updateSession', () => {
  it('should return 400 if neither status nor custom_context is provided', async () => {
    const req = { params: { id: '123' }, body: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await updateSession(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Status or custom_context is required' });
  });
}); 