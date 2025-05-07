import express from 'express';
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller.js';
// import { protect, admin } from '../middleware/authMiddleware.js'; // For later admin protection

const router = express.Router();

router.route('/')
  .post(createCategory) // Add protect, admin later
  .get(getAllCategories);

router.route('/:id')
  .get(getCategoryById)
  .put(updateCategory)    // Add protect, admin later
  .delete(deleteCategory); // Add protect, admin later

export default router;