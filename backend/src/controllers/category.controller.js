import { Category } from '../models/index.js';
import { Op } from 'sequelize';

// @desc    Create a new category
// @route   POST /api/categories
// @access  Public (for now, could be Admin later)
export const createCategory = async (req, res) => {
  const { name, description, parent_category_id } = req.body; // Removed image_url

  if (!name) {
    return res.status(400).json({ message: 'Category name is required' });
  }

  try {
    const existingCategory = await Category.findOne({ where: { name } });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category with this name already exists' });
    }

    const category = await Category.create({
      name,
      description,
      parent_category_id: parent_category_id || null,
    });
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Server error while creating category' });
  }
};

// getAllCategories and getCategoryById remain unchanged as they don't specifically handle image_url
// unless you were explicitly selecting it. Default behavior is to select all non-excluded fields.

export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { parent_category_id: null },
      include: [
        {
          model: Category,
          as: 'subcategories',
          include: [{ model: Category, as: 'subcategories' }],
        },
      ],
      order: [['name', 'ASC']],
    });
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error while fetching categories' });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id, {
      include: [
        { model: Category, as: 'subcategories' },
        { model: Category, as: 'parentCategory' },
      ],
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.status(200).json(category);
  } catch (error) {
    console.error('Error fetching category by ID:', error);
    res.status(500).json({ message: 'Server error while fetching category' });
  }
};


// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Public (for now, could be Admin later with 'protect' middleware)
export const updateCategory = async (req, res) => {
  const { name, description, parent_category_id } = req.body; // Removed image_url
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    if (name && name !== category.name) {
        const existingCategory = await Category.findOne({ where: { name, category_id: { [Op.ne]: req.params.id } } });
        if (existingCategory) {
            return res.status(400).json({ message: 'Another category with this name already exists' });
        }
    }

    category.name = name || category.name;
    category.description = description !== undefined ? description : category.description;
    category.parent_category_id = parent_category_id !== undefined ? (parent_category_id || null) : category.parent_category_id;
    // category.image_url = image_url !== undefined ? image_url : category.image_url; // <--- REMOVE THIS LINE

    await category.save();
    res.status(200).json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Server error while updating category' });
  }
};

// deleteCategory remains unchanged.

export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const subcategories = await Category.count({ where: { parent_category_id: req.params.id } });
    if (subcategories > 0) {
        return res.status(400).json({ message: 'Cannot delete category with subcategories. Delete or reassign them first.' });
    }

    await category.destroy();
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({ message: 'Cannot delete category. It is associated with other items (e.g., products or subcategories).' });
    }
    res.status(500).json({ message: 'Server error while deleting category' });
  }
};