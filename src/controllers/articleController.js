const Article = require('../models/Article');
const User = require('../models/User');
const slugify = require('../utils/slugify');
const { sanitizeInput, getPaginationParams } = require('../utils/helpers');
const { processProductImage, deleteImage } = require('../utils/imageProcessor');
const { Op } = require('sequelize');

// POST: Upload image for article content editor (admin only)
exports.uploadArticleImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Image file is required'
      });
    }

    const imageResult = await processProductImage(req.file.buffer, req.file.originalname);

    res.status(201).json({
      success: true,
      data: {
        image_url: imageResult.url
      },
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('Upload article image error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET: All published articles (public)
exports.getAllArticles = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const { pageNum, limitNum, offset } = getPaginationParams(page, limit);

    const where = { is_published: true };
    
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${sanitizeInput(search)}%` } },
        { content: { [Op.iLike]: `%${sanitizeInput(search)}%` } }
      ];
    }

    const { rows, count } = await Article.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [['published_at', 'DESC']],
      include: [
        { model: User, attributes: ['id', 'name', 'email'] }
      ]
    });

    res.json({
      success: true,
      data: rows,
      total: count,
      pages: Math.ceil(count / limitNum),
      message: 'Articles retrieved successfully'
    });
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET: Single article by slug (public)
exports.getArticleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const article = await Article.findOne({
      where: { slug, is_published: true },
      include: [
        { model: User, attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Increment view count
    await article.increment('view_count');

    res.json({
      success: true,
      data: article,
      message: 'Article retrieved successfully'
    });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET: All articles for admin (including unpublished)
exports.getAllArticlesAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', published = '' } = req.query;
    const { pageNum, limitNum, offset } = getPaginationParams(page, limit);

    const where = {};
    
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${sanitizeInput(search)}%` } },
        { content: { [Op.iLike]: `%${sanitizeInput(search)}%` } }
      ];
    }

    if (published === 'true') {
      where.is_published = true;
    } else if (published === 'false') {
      where.is_published = false;
    }

    const { rows, count } = await Article.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        { model: User, attributes: ['id', 'name', 'email'] }
      ]
    });

    res.json({
      success: true,
      data: rows,
      total: count,
      pages: Math.ceil(count / limitNum),
      message: 'Articles retrieved successfully'
    });
  } catch (error) {
    console.error('Get articles (admin) error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// POST: Create article (admin only)
exports.createArticle = async (req, res) => {
  try {
    const { title, content, excerpt, is_published, featured_image } = req.body;
    const author_id = req.user.id;

    // Validate input
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    const titleClean = sanitizeInput(title);
    const slug = slugify(titleClean);

    // Check if slug already exists
    const existingArticle = await Article.findOne({ where: { slug } });
    if (existingArticle) {
      return res.status(400).json({
        success: false,
        message: 'An article with this title already exists'
      });
    }

    // Process featured image if provided
    let featuredImage = null;
    if (req.file) {
      try {
        const imageResult = await processProductImage(req.file.buffer, req.file.originalname);
        featuredImage = imageResult.url;
      } catch (imageError) {
        return res.status(400).json({
          success: false,
          message: `Image processing failed: ${imageError.message}`
        });
      }
    } else if (featured_image) {
      featuredImage = sanitizeInput(featured_image);
    }

    const article = await Article.create({
      title: titleClean,
      content: sanitizeInput(content),
      excerpt: excerpt ? sanitizeInput(excerpt) : null,
      author_id,
      featured_image: featuredImage,
      slug,
      is_published: is_published === 'true' || is_published === true,
      published_at: (is_published === 'true' || is_published === true) ? new Date() : null
    });

    res.status(201).json({
      success: true,
      data: article,
      message: 'Article created successfully'
    });
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// PUT: Update article (admin only)
exports.updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, excerpt, is_published, featured_image } = req.body;

    const article = await Article.findByPk(id);
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Update featured image if provided
    let featuredImage = article.featured_image;
    if (req.file) {
      try {
        // Delete old image
        await deleteImage(article.featured_image);
        // Process new image
        const imageResult = await processProductImage(req.file.buffer, req.file.originalname);
        featuredImage = imageResult.url;
      } catch (imageError) {
        return res.status(400).json({
          success: false,
          message: `Image processing failed: ${imageError.message}`
        });
      }
    } else if (featured_image) {
      featuredImage = sanitizeInput(featured_image);
    }

    // Update article
    const updateData = {
      ...(title && { title: sanitizeInput(title) }),
      ...(content && { content: sanitizeInput(content) }),
      ...(excerpt && { excerpt: sanitizeInput(excerpt) }),
      ...(featuredImage && { featured_image: featuredImage }),
      ...(is_published !== undefined && { 
        is_published: is_published === 'true' || is_published === true,
        published_at: (is_published === 'true' || is_published === true) ? new Date() : null
      })
    };

    await article.update(updateData);

    res.json({
      success: true,
      data: article,
      message: 'Article updated successfully'
    });
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// DELETE: Delete article (admin only)
exports.deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await Article.findByPk(id);
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Delete featured image
    await deleteImage(article.featured_image);

    // Delete article
    await article.destroy();

    res.json({
      success: true,
      message: 'Article deleted successfully'
    });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// PATCH: Publish/unpublish article (admin only)
exports.togglePublish = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_published } = req.body;

    if (is_published === undefined) {
      return res.status(400).json({
        success: false,
        message: 'is_published field is required'
      });
    }

    const article = await Article.findByPk(id);
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    const shouldPublish = is_published === 'true' || is_published === true;

    await article.update({
      is_published: shouldPublish,
      published_at: shouldPublish ? new Date() : null
    });

    res.json({
      success: true,
      data: article,
      message: `Article ${shouldPublish ? 'published' : 'unpublished'} successfully`
    });
  } catch (error) {
    console.error('Toggle publish error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
