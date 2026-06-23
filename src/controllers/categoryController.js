const Category = require('../models/Category');
const slugify = require('../utils/slugify');
const { sanitizeInput } = require('../utils/helpers');

// GET: All categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { is_active: true },
      order: [['display_order', 'ASC'], ['name', 'ASC']]
    });

    res.json({
      success: true,
      data: categories,
      total: categories.length,
      message: 'Categories retrieved successfully'
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// POST: Create category (admin only)
exports.createCategory = async (req, res) => {
  try {
    const { name, slug: customSlug, description, display_order } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    const nameClean = sanitizeInput(name);
    const slug = customSlug ? slugify(sanitizeInput(customSlug)) : slugify(nameClean);

    // Check if category already exists
    const existingCategory = await Category.findOne({ where: { slug } });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    const category = await Category.create({
      name: nameClean,
      slug,
      description: description ? sanitizeInput(description) : null,
      display_order: display_order ? parseInt(display_order) : 0
    });

    res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully'
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// PUT: Update category (admin only)
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug: customSlug, description, display_order, is_active } = req.body;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const slug = customSlug ? slugify(sanitizeInput(customSlug)) : undefined;

    if (slug && slug !== category.slug) {
      const existingSlug = await Category.findOne({ where: { slug } });
      if (existingSlug) {
        return res.status(400).json({
          success: false,
          message: 'Category slug already exists'
        });
      }
    }

    const updateData = {
      ...(name && { name: sanitizeInput(name) }),
      ...(slug && { slug }),
      ...(description && { description: sanitizeInput(description) }),
      ...(display_order !== undefined && { display_order: parseInt(display_order) || 0 }),
      ...(is_active !== undefined && { is_active: is_active === 'true' || is_active === true })
    };

    await category.update(updateData);

    res.json({
      success: true,
      data: category,
      message: 'Category updated successfully'
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// DELETE: Delete category (admin only)
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    await category.destroy();

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
