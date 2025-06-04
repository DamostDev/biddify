// backend/src/controllers/product.controller.js
import { Product, User, Category, ProductImage, sequelize, StreamProduct, Stream } from '../models/index.js';
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

    // Fetch details BEFORE commit
    const newProductWithDetails = await Product.findByPk(product.product_id, {
      include: [
        { model: User, as: 'Owner', attributes: ['user_id', 'username', 'profile_picture_url'] }, // <<< ADDED as: 'Owner'
        { model: Category, attributes: ['category_id', 'name'] },
        { model: ProductImage, as: 'images', attributes: ['image_id', 'image_url', 'is_primary'] }
      ],
      transaction: t // Include in transaction for read consistency
    });

    await t.commit(); // NOW commit

    res.status(201).json(newProductWithDetails);
  } catch (error) {
    // Check if transaction is still active before trying to rollback
    if (t && !t.finished) { // 'finished' can be 'commit', 'rollback', or undefined if not started/finished
        try {
            await t.rollback();
        } catch (rollbackError) {
            console.error('Error rolling back transaction:', rollbackError);
        }
    }
    // Only attempt rollback if transaction hasn't been committed or rolled back
    if (t && !t.finished) {
      try {
        await t.rollback();
      } catch (rollbackError) {
        console.error("Error rolling back transaction:", rollbackError);
      }
    }
    console.error('Error creating product:', error);
    // Cleanup uploaded files if transaction fails (and was rolled back or never committed)
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        // Check if file.path exists before unlinking, as multer might not have saved it if an early error occurred
        if (file.path && fs.existsSync(file.path)) {
            fs.unlink(file.path, err => {
              if (err) console.error("Error deleting uploaded file on failure:", err);
            });
        }
      });
    }
    // If the error happened after commit (e.g., fetching details failed)
    if (t.finished === 'commit' && error.message.includes('EagerLoadingError')) {
        return res.status(500).json({ message: 'Product created, but server error fetching full details. ' + error.message });
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
        { model: User, as: 'Owner', attributes: ['user_id', 'username', 'profile_picture_url'] }, // <<< ADDED as: 'Owner'
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
        { model: User, as: 'Owner', attributes: ['user_id', 'username', 'profile_picture_url', 'seller_rating'] }, // <<< ADDED as: 'Owner'
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
      where: { user_id: req.user.user_id },
      include: [
        { model: User, as: 'Owner', attributes: ['user_id', 'username', 'profile_picture_url'] }, // Include Owner info
        { model: Category, attributes: ['category_id', 'name'], required: false },
        { model: ProductImage, as: 'images', attributes: ['image_id', 'image_url', 'is_primary'], where: {is_primary: true}, required: false },
        {
          model: Stream,
          as: 'FeaturedInStreams', // Alias for Product.belongsToMany(Stream, { as: 'FeaturedInStreams', through: StreamProduct })
          attributes: ['stream_id', 'title', 'status'],
          through: {
            attributes: [] // Explicitly exclude attributes from the StreamProduct join table in the result
          },
          required: false // Make this a LEFT JOIN so products without streams are still returned
        }
      ],
      order: [['created_at', 'DESC']],
    });
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching user products:', error);
    res.status(500).json({ message: 'Server error fetching user products: ' + error.message });
  }
};

// @desc    Get products by a specific user ID
// @route   GET /api/products/user/:userId
// @access  Public
export const getProductsByUserId = async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await User.findByPk(userId); // Check if user exists
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const products = await Product.findAll({
            where: { user_id: userId, is_active: true }, // Only active products for public view
            include: [
              // No User model needed here as we're filtering by user_id directly and already have user from above.
              // If you did want to include the User object itself for each product (redundant here):
              // { model: User, as: 'Owner', attributes: [...] },
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
  const t = await sequelize.transaction();

  try {
    const product = await Product.findByPk(req.params.id, {
        include: [{model: ProductImage, as: 'images'}], // No User needed for the update logic itself
        transaction: t
    });

    if (!product) {
      await t.rollback(); // Rollback here is safe as commit hasn't happened
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.user_id !== req.user.user_id) {
      await t.rollback();
      return res.status(403).json({ message: 'User not authorized to update this product' });
    }

    product.title = title || product.title;
    product.description = description !== undefined ? description : product.description;
    product.category_id = category_id !== undefined ? (category_id || null) : product.category_id;
    product.condition = condition || product.condition;
    product.original_price = original_price || product.original_price;
    product.is_active = is_active !== undefined ? is_active : product.is_active;
    
    await product.save({ transaction: t });

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
            const filename = path.basename(img.image_url);
            const filePath = path.join('public/uploads/products/', filename);
             try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (fileError) {
                console.error("Error deleting image file during update:", fileError);
            }
            await img.destroy({ transaction: t });
        }
    }

    if (req.files && req.files.length > 0) {
        let hasPrimaryImage = product.images ? product.images.some(img => img.is_primary && !(images_to_delete || []).includes(String(img.image_id))) : false;
        if (!hasPrimaryImage) { // Check again if a primary was deleted
             const remainingImages = await ProductImage.findAll({
                where: { product_id: product.product_id, is_primary: true },
                transaction: t
            });
            hasPrimaryImage = remainingImages.length > 0;
        }

        const newImageRecords = req.files.map((file, index) => ({
            product_id: product.product_id,
            image_url: `${getBaseUrl(req)}/uploads/products/${file.filename}`,
            is_primary: !hasPrimaryImage && index === 0, 
        }));
        await ProductImage.bulkCreate(newImageRecords, { transaction: t });
    }
    
    // Fetch details BEFORE commit
    const updatedProductWithDetails = await Product.findByPk(req.params.id, {
      include: [
        { model: User, as: 'Owner', attributes: ['user_id', 'username', 'profile_picture_url'] }, // <<< ADDED as: 'Owner'
        { model: Category, attributes: ['category_id', 'name'] },
        { model: ProductImage, as: 'images', attributes: ['image_id', 'image_url', 'is_primary'], order: [['is_primary', 'DESC']] }
      ],
      transaction: t // Include in transaction
    });

    await t.commit(); // NOW commit

    res.status(200).json(updatedProductWithDetails);
  } catch (error) {
    if (t && !t.finished) {
        try {
            await t.rollback();
        } catch (rollbackError) {
            console.error('Error rolling back transaction:', rollbackError);
        }
    }
    if (t && !t.finished) {
      try {
        await t.rollback();
      } catch (rollbackError) {
        console.error("Error rolling back transaction on update:", rollbackError);
      }
    }
    console.error('Error updating product:', error);
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
         if (file.path && fs.existsSync(file.path)) {
            fs.unlink(file.path, err => {
              if (err) console.error("Error deleting newly uploaded file on update failure:", err);
            });
        }
      });
    }
    if (t.finished === 'commit' && error.message.includes('EagerLoadingError')) {
        return res.status(500).json({ message: 'Product updated, but server error fetching full details. ' + error.message });
    }
    res.status(500).json({ message: 'Server error updating product' });
  }
};

// deleteProduct can remain as is, as it doesn't fetch User details after Product.findByPk for the response in the same problematic way.
// However, if you were to return the deleted product's details with user, you'd need the alias there too.

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Protected
export const deleteProduct = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const product = await Product.findByPk(req.params.id, {
        include: [{ model: ProductImage, as: 'images' }], // No User include needed for delete logic
        transaction: t
    });

    if (!product) {
      await t.rollback();
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.user_id !== req.user.user_id) {
      await t.rollback();
      return res.status(403).json({ message: 'User not authorized to delete this product' });
    }

    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        const filename = path.basename(image.image_url);
        const filePath = path.join('public/uploads/products/', filename); 
        try {
            const urlObject = new URL(image.image_url);
            const filename = path.basename(urlObject.pathname);
            const filePath = path.join('public/uploads/products/', filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (fileError) {
            console.error("Error parsing URL or deleting image file:", image.image_url, fileError);
        }
      }
    }
    // ProductImages will be cascade deleted if `onDelete: 'CASCADE'` is set in Product model association.
    // If not, manually delete:
    // await ProductImage.destroy({ where: { product_id: product.product_id }, transaction: t });


    await product.destroy({ transaction: t }); 
    await t.commit();

    res.status(200).json({ message: 'Product deleted successfully' }); 
  } catch (error) {
    if (t && !t.finished) {
      try {
        await t.rollback();
      } catch (rollbackError) {
        console.error("Error rolling back transaction on delete:", rollbackError);
      }
    }
    console.error('Error deleting product:', error);
    if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({ message: 'Cannot delete product. It is associated with other items (e.g., active auctions or orders).' });
    }
    res.status(500).json({ message: 'Server error deleting product' });
  }
};
export const assignProductsToStream = async (req, res) => {
  const { product_ids, stream_id } = req.body;
  const user_id = req.user.user_id;

  if (!Array.isArray(product_ids) || product_ids.length === 0 || !stream_id) {
    return res.status(400).json({ message: 'Product IDs (array) and Stream ID are required.' });
  }

  const t = await sequelize.transaction();
  try {
    // 1. Verify the stream exists and belongs to the current user
    const stream = await Stream.findOne({
      where: { stream_id: stream_id, user_id: user_id },
      transaction: t,
    });

    if (!stream) {
      await t.rollback();
      return res.status(404).json({ message: 'Stream not found or you are not authorized for this stream.' });
    }
    // Optional: Add status check for stream (e.g., only 'scheduled' or 'live')

    // 2. Verify all products exist and belong to the user
    const productsToAssign = await Product.findAll({
      where: {
        product_id: { [Op.in]: product_ids },
        user_id: user_id,
      },
      // No need to include Auction here unless you have specific logic for it during assignment to stream
      transaction: t,
    });

    if (productsToAssign.length !== product_ids.length) {
      await t.rollback();
      const foundIds = productsToAssign.map(p => p.product_id);
      const missingOrUnauthorizedIds = product_ids.filter(id => !foundIds.includes(Number(id))); // Ensure ID comparison is correct type
      return res.status(404).json({ message: `One or more products not found or not owned by you. IDs: ${missingOrUnauthorizedIds.join(', ')}` });
    }

    // 3. Create associations in the StreamProduct table
    // We'll use bulkCreate with ignoreDuplicates to avoid errors if an association already exists.
    // Alternatively, you can query for existing associations first.
    const streamProductEntries = product_ids.map(product_id => ({
      stream_id: parseInt(stream_id),
      product_id: parseInt(product_id),
      // added_at will be set by default or by Sequelize's createdAt
    }));

    await StreamProduct.bulkCreate(streamProductEntries, {
      transaction: t,
      ignoreDuplicates: true, // If a product is already in the stream, don't throw an error
    });

    await t.commit();

    // Count how many were actually newly created (optional, bulkCreate doesn't easily return this with ignoreDuplicates)
    // For a precise count of new associations, you'd query before and after or handle unique constraint errors.
    // For simplicity, we assume all valid products were intended for association.
    const assignedCount = product_ids.length;


    res.status(200).json({
      message: `${assignedCount} product(s) processed for assignment to stream "${stream.title}".`,
      assigned_product_ids: product_ids,
      stream_id: stream_id,
    });

  } catch (error) {
    if (t && !t.finished) {
      try { await t.rollback(); } catch (rbError) { console.error("Rollback error:", rbError); }
    }
    console.error('Error assigning products to stream:', error);
    // Check for specific Sequelize errors if needed
    // if (error.name === 'SequelizeUniqueConstraintError') {
    //   return res.status(400).json({ message: 'Some products are already assigned to this stream.' });
    // }
    res.status(500).json({ message: 'Server error assigning products to stream.' });
  }
};