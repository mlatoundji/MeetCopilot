import jwt from 'jsonwebtoken';

/**
 * Authentication middleware to verify a JSON Web Token (JWT) in the Authorization header.
 * Checks for the presence of a Bearer token and validates it using the JWT_SECRET environment variable.
 * On success, attaches the decoded token payload to req.user and calls next().
 * On failure, sends a 401 Unauthorized response or a 500 Internal Server Error if the JWT_SECRET is not set.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - Callback to pass control to the next middleware.
 * @returns {void}
 */
export const authenticateUser = (req, res, next) => {
    try {
        // Get the token from the Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        // Extract token and ensure it exists
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token missing' });
        }
        
        // Ensure JWT_SECRET is defined
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('JWT_SECRET environment variable is not defined');
            return res.status(500).json({ error: 'Server configuration error: JWT_SECRET not set' });
        }
        
        // Verify the token
        const decoded = jwt.verify(token, secret);
        
        // Add the user info to the request object
        req.user = decoded;
        
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        if (error instanceof jwt.TokenExpiredError) {
            // Token has expired
            return res.status(401).json({ error: 'Token has expired' });
        } else if (error instanceof jwt.JsonWebTokenError) {
            // Invalid token (malformed or signature issues)
            return res.status(401).json({ error: 'Invalid token' });
        } else if (error instanceof jwt.NotBeforeError) {
            // Token is not active yet
            return res.status(401).json({ error: 'Token not active yet' });
        } else {
            // Other unexpected errors
            return res.status(500).json({ error: 'Authentication processing error' });
        }
    }
}; 