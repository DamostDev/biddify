import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import {
  createProduct,
  getAllProducts,
  getProductById,
  getProductsByLoggedInUser,
  getProductsByUserId,
  updateProduct,
  deleteProduct,
  // addProductImage, // Optional: dedicated endpoint to add more images later
  // removeProductImage, // Optional
} from '../controllers/product.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Multer Setup for Product Images ---
const PRODUCT_UPLOAD_DIR = 'public/uploads/products/';

// Ensure upload directory exists
if (!fs.existsSync(PRODUCT_UPLOAD_DIR)){
    fs.mkdirSync(PRODUCT_UPLOAD_DIR, { recursive: true });
    console.log(`Created directory: ${PRODUCT_UPLOAD_DIR}`);
} else {
    console.log(`Directory already exists: ${PRODUCT_UPLOAD_DIR}`);
}


const productStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, PRODUCT_UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const productFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const uploadProductImages = multer({
  storage: productStorage,
  fileFilter: productFileFilter,
  limits: { fileSize: 1024 * 1024 * 10 } // 10MB limit per file
});
// --- End Multer Setup ---


// Product Routes
router.route('/')
  .post(protect, uploadProductImages.array('images', 5), createProduct) // 'images' is field name, max 5 files
  .get(getAllProducts);

router.get('/me', protect, getProductsByLoggedInUser); // Get products for logged-in user
router.get('/user/:userId', getProductsByUserId);   // Get products for a specific user ID

router.route('/:id')
  .get(getProductById)
  .put(protect, uploadProductImages.array('newImages', 5), updateProduct) // Handle new image uploads during update
  .delete(protect, deleteProduct);

// Optional: Routes for managing images separately after product creation
// router.post('/:id/images', protect, uploadProductImages.array('images', 5), addProductImage);
// router.delete('/:id/images/:imageId', protect, removeProductImage);


export default router;