// middleware/authMiddleware.js
import { verifyToken } from '../lib/jwtUtils.js';
import User from '../models/user.model.js';

export const protect = async (req, res, next) => {
  let token;

  // 1. Read token from HttpOnly cookie instead of Authorization header
  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  // If no token found in cookies
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    // 2. Verify token
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
       return res.status(401).json({ message: 'Not authorized, token failed verification' });
    }

    // 3. Find user based on token payload (user_id)
    // Uses defaultScope (password_hash excluded)
    req.user = await User.findByPk(decoded.id);

    if (!req.user) {
       return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    // 4. Grant access
    next();
  } catch (error) {
    console.error('Authentication Middleware Error:', error);
    // Handle specific JWT errors if needed (e.g., TokenExpiredError)
    if (error.name === 'TokenExpiredError') {
        // Optionally clear the expired cookie
        // res.clearCookie('jwt', { httpOnly: true, path: '/', sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' });
        return res.status(401).json({ message: 'Not authorized, token expired' });
    }
     if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Not authorized, token invalid' });
    }
    res.status(401).json({ message: 'Not authorized, token processing error' });
  }
};