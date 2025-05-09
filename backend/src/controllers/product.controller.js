import { Product, User, Category, ProductImage, sequelize } from '../models/index.js';
import fs from 'fs'; // For deleting files
import path from 'path';
import { Op } from 'sequelize';

const getBaseUrl = (req) => `${req.protocol}://${req.get('host')}`;

// @desc    Create a new product
// @route   POST /api/products
// @access  Protected
export const createProduct = async (req, res) => {
  const { title, description, category_id, condition, original_price, is_active = true } = req.body;
  const user_id = req.user.user_id; // From protect middleware

  if (!title || !original_price) {
    return res.status(400).json({ message: 'Title and original price are required' });
  }
  if (category_id && !(await Category.findByPk(category_id))) {
    return res.status(400).json({ message: 'Invalid category ID' });
  }

  const t = await sequelize.transaction();
  try {
    const product = await Product.create({
      user_id,
      title,
      description,
      category_id: category_id || null,
      condition,
      original_price,
      is_active
    }, { transaction: t });

    if (req.files && req.files.length > 0) {
      const imageRecords = req.files.map((file, index) => ({
        product_id: product.product_id,
        image_url: `${getBaseUrl(req)}/uploads/products/${file.filename}`,
        is_primary: index === 0, // Make the first uploaded image primary
      }));
      await ProductImage.bulkCreate(imageRecords, { transaction: t });
    }

    await t.commit();

    const newProductWithDetails = await Product.findByPk(product.product_id, {
      include: [
        { model: User, attributes: ['user_id', 'username', 'profile_picture_url'] },
        { model: Category, attributes: ['category_id', 'name'] },
        { model: ProductImage, as: 'images', attributes: ['image_id', 'image_url', 'is_primary'] }
      ]
    });

    res.status(201).json(newProductWithDetails);
  } catch (error) {
    await t.rollback();
    console.error('Error creating product:', error);
    // Cleanup uploaded files if transaction fails
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        fs.unlink(file.path, err => {
          if (err) console.error("Error deleting uploaded file on failure:", err);
        });
      });
    }
    res.status(500).json({ message: 'Server error creating product' });
  }
};

// @desc    Get all active products
// @route   GET /api/products
// @access  Public
export const getAllProducts = async (req, res) => {
  // Add pagination, filtering (by category, condition, search term) later
  try {
    const products = await Product.findAll({
      where: { is_active: true },
      include: [
        { model: User, attributes: ['user_id', 'username', 'profile_picture_url'] },
        { model: Category, attributes: ['category_id', 'name'] },
        { model: ProductImage, as: 'images', attributes: ['image_id', 'image_url', 'is_primary'], where: {is_primary: true}, required: false } // Get only primary image for list view
      ],
      order: [['created_at', 'DESC']],
    });
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error while fetching products' });
  }
};

// @desc    Get a single product by ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ['user_id', 'username', 'profile_picture_url', 'seller_rating'] },
        { model: Category, attributes: ['category_id', 'name'] },
        { model: ProductImage, as: 'images', attributes: ['image_id', 'image_url', 'is_primary'], order: [['is_primary', 'DESC'], ['created_at', 'ASC']] }
      ],
    });
     
    if (!product || !product.is_active) { // Also check if product is active
      return res.status(404).json({ message: 'Product not found or not active' });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    res.status(500).json({ message: 'Server error while fetching product' });
  }
};

// @desc    Get products by logged-in user
// @route   GET /api/products/me
// @access  Protected
export const getProductsByLoggedInUser = async (req, res) => {
    try {
      const products = await Product.findAll({
        where: { user_id: req.user.user_id }, // Get all, including inactive for owner
        include: [
          { model: Category, attributes: ['category_id', 'name'] },
          { model: ProductImage, as: 'images', attributes: ['image_id', 'image_url', 'is_primary'], where: {is_primary: true}, required: false }
        ],
        order: [['created_at', 'DESC']],
      });
      res.status(200).json(products);
    } catch (error) {
      console.error('Error fetching user products:', error);
      res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get products by a specific user ID
// @route   GET /api/products/user/:userId
// @access  Public
export const getProductsByUserId = async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const products = await Product.findAll({
            where: { user_id: userId, is_active: true }, // Only active products for public view
            include: [
              { model: Category, attributes: ['category_id', 'name'] },
              { model: ProductImage, as: 'images', attributes: ['image_id', 'image_url', 'is_primary'], where: {is_primary: true}, required: false }
            ],
            order: [['created_at', 'DESC']],
        });
        res.status(200).json(products);
    } catch (error) {
        console.error('Error fetching products by user ID:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Protected
export const updateProduct = async (req, res) => {
  const { title, description, category_id, condition, original_price, is_active, images_to_delete } = req.body;
  // images_to_delete should be an array of image_id's
  const t = await sequelize.transaction();

  try {
    const product = await Product.findByPk(req.params.id, {
        include: [{model: ProductImage, as: 'images'}],
        transaction: t
    });

    if (!product) {
      await t.rollback();
      return res.status(404).json({ message: 'Product not found' });
    }

    // Authorization: Check if logged-in user owns the product
    if (product.user_id !== req.user.user_id) {
      await t.rollback();
      return res.status(403).json({ message: 'User not authorized to update this product' });
    }

    // Update product fields
    product.title = title || product.title;
    product.description = description !== undefined ? description : product.description;
    product.category_id = category_id !== undefined ? (category_id || null) : product.category_id;
    product.condition = condition || product.condition;
    product.original_price = original_price || product.original_price;
    product.is_active = is_active !== undefined ? is_active : product.is_active;
    
    await product.save({ transaction: t });

    // Handle image deletion
    if (images_to_delete && Array.isArray(images_to_delete) && images_to_delete.length > 0) {
        const imageIdsToDelete = images_to_delete.map(id => parseInt(id)).filter(id => !isNaN(id));
        const imagesToDeleteRecords = await ProductImage.findAll({
            where: {
                product_id: product.product_id,
                image_id: { [Op.in]: imageIdsToDelete }
            },
            transaction: t
        });

        for (const img of imagesToDeleteRecords) {
            // Delete file from server
            const filename = path.basename(img.image_url);
            const filePath = path.join('public/uploads/products/', filename); // Adjust path if needed
             try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (fileError) {
                console.error("Error deleting image file during update:", fileError);
                // Decide if this should halt the transaction or just log
            }
            await img.destroy({ transaction: t });
        }
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
        // Determine if there's already a primary image, if not, make the first new one primary
        let hasPrimaryImage = product.images ? product.images.some(img => img.is_primary) : false;
        if (images_to_delete && Array.isArray(images_to_delete)) { // Recheck after deletion
            const remainingImages = product.images.filter(img => !images_to_delete.includes(String(img.image_id)));
            hasPrimaryImage = remainingImages.some(img => img.is_primary);
        }


        const newImageRecords = req.files.map((file, index) => ({
            product_id: product.product_id,
            image_url: `${getBaseUrl(req)}/uploads/products/${file.filename}`,
            is_primary: !hasPrimaryImage && index === 0, // Make first new image primary if no existing primary
        }));
        await ProductImage.bulkCreate(newImageRecords, { transaction: t });
    }
    
    await t.commit();

    const updatedProductWithDetails = await Product.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ['user_id', 'username', 'profile_picture_url'] },
        { model: Category, attributes: ['category_id', 'name'] },
        { model: ProductImage, as: 'images', attributes: ['image_id', 'image_url', 'is_primary'], order: [['is_primary', 'DESC']] }
      ]
    });

    res.status(200).json(updatedProductWithDetails);
  } catch (error) {
    await t.rollback();
    console.error('Error updating product:', error);
    // Cleanup newly uploaded files if transaction fails
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        fs.unlink(file.path, err => {
          if (err) console.error("Error deleting newly uploaded file on update failure:", err);
        });
      });
    }
    res.status(500).json({ message: 'Server error updating product' });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Protected
export const deleteProduct = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const product = await Product.findByPk(req.params.id, {
        include: [{ model: ProductImage, as: 'images' }],
        transaction: t
    });

    if (!product) {
      await t.rollback();
      return res.status(404).json({ message: 'Product not found' });
    }

    // Authorization: Check if logged-in user owns the product
    if (product.user_id !== req.user.user_id) {
      await t.rollback();
      return res.status(403).json({ message: 'User not authorized to delete this product' });
    }

    // Delete associated images from server and DB
    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        const filename = path.basename(image.image_url);
        const filePath = path.join('public/uploads/products/', filename); // Adjust path
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (fileError) {
            console.error("Error deleting image file:", fileError);
            // Potentially log this but continue, as DB record deletion is more critical
        }
        // ProductImage records will be cascade deleted if set up in model association
        // Or delete them manually: await image.destroy({ transaction: t });
      }
    }
    // If onDelete: 'CASCADE' is set for ProductImages in Product model, they'll be deleted.
    // Otherwise, manually delete:
    // await ProductImage.destroy({ where: { product_id: product.product_id }, transaction: t });


    await product.destroy({ transaction: t }); // This will trigger cascade delete for ProductImages if defined
    await t.commit();

    res.status(200).json({ message: 'Product deleted successfully' }); // or 204
  } catch (error) {
    await t.rollback();
    console.error('Error deleting product:', error);
    if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({ message: 'Cannot delete product. It is associated with other items (e.g., active auctions or orders).' });
    }
    res.status(500).json({ message: 'Server error deleting product' });
  }
};