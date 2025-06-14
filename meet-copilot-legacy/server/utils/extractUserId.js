import jwt from 'jsonwebtoken';

export const extractUserId = (req) => {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const decoded = jwt.decode(token);
        return decoded?.sub || null;
    }
    return null;
}