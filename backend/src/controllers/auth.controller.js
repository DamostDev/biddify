import { User } from "../models/index.js";
import dotenv from "dotenv";
import { generateToken } from '../lib/jwtUtils.js';
import { Op } from 'sequelize';
import ms from 'ms';

dotenv.config();

const cookieOptions = {
  httpOnly: true, 
  secure: process.env.NODE_ENV === 'production', 
  sameSite: 'Lax', 
  path: '/', 
  maxAge: ms(process.env.JWT_EXPIRES_IN || '1d') // Alternative to expires
};

export const signup = async (req, res) => {
  const { username, email, password } = req.body;


  if (!username || !email || !password ) {
    return res.status(400).json({ message: 'Please provide username, email, and password' });
  }

  try {
    // 1. Check if user already exists (by email or username)
    // Uses defaultScope, so password_hash is not fetched here
    const userExists = await User.findOne({
      where: {
        [Op.or]: [{ email: email }, { username: username }],
      },
    });

    if (userExists) {
      let message = 'User already exists.';
      if (userExists.email === email) message = 'Email already in use.';
      if (userExists.username === username) message = 'Username already taken.';
      return res.status(400).json({ message });
    }

    // 2. Create new user
   
    const newUser = await User.create({
      username,
      email,
      password_hash: password, 
      // Hook handles hashing
      // Add default values for other required fields if necessary
      is_verified: false, 
    });

    // 3. Generate JWT token using the user's primary key (user_id)
   
      const token = generateToken(newUser.user_id);
        // 4. Send Response

      res.cookie('jwt', token, cookieOptions);
      res.status(201).json({
        message: 'User registered successfully',
        user: newUser, // Send user data (password excluded by defaultScope)
      });

 

  } catch (error) {
    console.error('Registration Controller Error:', error);
    // Handle specific Sequelize errors for better feedback
    if (error.name === 'SequelizeUniqueConstraintError') {
        // Try to determine which field caused the error
        const field = error.errors?.[0]?.path || (error.message.includes('email') ? 'email' : 'username');
        const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
        return res.status(400).json({ message });
    }
    if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(err => err.message);
        return res.status(400).json({ message: 'Validation Error', errors: messages });
    }
    res.status(500).json({ message: 'Server error during registration' });
  }
}
export const login = async (req, res) => {        
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  try {
    // 1. Find user by email
   
    const user = await User.scope('withPassword').findOne({ where: { email: email } });

    // 2. Check if user exists AND if the provided password matches the stored hash
   
    if (user && (await user.comparePassword(password))) {

      //  Update the last_login field
    

      // 3. Generate JWT token using the user's primary key (user_id)
      const token = generateToken(user.user_id);

      res.cookie('jwt', token, cookieOptions);
      // 4. Prepare user data for response (excluding password hash)
      
      const userToSend = await User.findByPk(user.user_id);

      // Safety check in case refetch fails (highly unlikely)
      if (!userToSend) {
          console.error("Login Error: Could not refetch user after successful login.");
          return res.status(500).json({ message: 'Server error during login post-processing' });
      }

      // 5. Send Response
      res.status(200).json({
        message: 'Login successful',
        user: userToSend, // Send the user object fetched with default scope (no password)
      });

    } else {
      // User not found or password didn't match
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login Controller Error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};
export const getMe = (req, res) => {
  // The 'protect' middleware (updated below) will handle reading the cookie
  // and attaching req.user. This controller logic remains the same.
  const user = req.user;
  if (user) {
    res.status(200).json(user);
  } else {
    console.error("GetMe Controller: req.user not found after 'protect' middleware.");
    res.status(401).json({ message: 'Not authorized, user data unavailable' });
  }
};

export const logout = (req, res) => {
     // Define options that MATCH the ones used for setting the cookie
    // Browsers require path/domain/secure/samesite to match for clearing
    const clearCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
      // domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : undefined, // Match domain if used
  };


  res.cookie('jwt', '', { ...clearCookieOptions, expires: new Date(0) });

  // Send a success response (200 OK or 204 No Content)
  res.status(200).json({ message: 'Logout successful' });
};
