 import express from 'express';
 import { signup, login, logout, getMe } from '../controllers/auth.controller.js'; 
 import { protect } from '../middleware/authMiddleware.js';

 
const router = express.Router();

router.post("/signup", signup);

router.post("/login", login);

router.get('/me', protect, getMe);


router.post("/logout",logout);
 export default router;
