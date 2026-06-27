const Product = require('../models/Product');
const ProductImage = require('../models/ProductImage');
const Category = require('../models/Category');
const { Op } = require('sequelize');
const XLSX = require('xlsx');
const slugify = require('../utils/slugify');
const { processProductImage, deleteImage } = require('../utils/imageProcessor');
const { getPaginationParams, sanitizeInput } = require('../utils/helpers');

const TEMPLATE_HEADERS = [
  'SKUCode',
  'InventoryItemName',
  'ItemCategoryCode',
  'ItemCategoryName',
  'BrandName',
  '',
  'UnitName',
  'Color',
  'Size',
  'UnitPrice',
  'TaxRate',
  'OpeningQuantity',
  'OpeningAmount',
  'OpeningStockName'
];

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const text = String(value ?? '').trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'co', 'c', 'on'].includes(text)) return true;
  if (['0', 'false', 'no', 'n', 'khong', 'k', 'off'].includes(text)) return false;
  return null;
};

const normalizeHeader = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const findField = (row, aliases) => {
  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizeHeader(key);
    if (aliases.includes(normalized)) {
      return value;
    }
  }
  return undefined;
};

const toOptionalString = (value) => {
  if (value === undefined || value === null) return null;
  const str = String(value).trim();
  return str === '' ? null : sanitizeInput(str);
};

const toNumber = (value, fallback = null) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback;
  }

  const normalized = String(value).replace(/,/g, '').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isTemplateHeaderRow = (row) => {
  if (!Array.isArray(row)) {
    return false;
  }

  const normalized = row.map((cell) => String(cell ?? '').trim());
  return (
    normalized[0] === TEMPLATE_HEADERS[0] &&
    normalized[1] === TEMPLATE_HEADERS[1] &&
    normalized[2] === TEMPLATE_HEADERS[2] &&
    normalized[3] === TEMPLATE_HEADERS[3] &&
    normalized[6] === TEMPLATE_HEADERS[6] &&
    normalized[9] === TEMPLATE_HEADERS[9] &&
    normalized[10] === TEMPLATE_HEADERS[10] &&
    normalized[11] === TEMPLATE_HEADERS[11]
  );
};

// GET: All products (public)
exports.getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search = '',
      category = '',
      include_inactive = 'false',
      is_active,
      featured
    } = req.query;
    const { pageNum, limitNum, offset } = getPaginationParams(page, limit);

    // Build where clause
    const where = {};
    const includeInactive = parseBoolean(include_inactive) === true;

    if (!includeInactive) {
      where.is_active = true;
    }

    if (is_active !== undefined && is_active !== '') {
      const activeState = parseBoolean(is_active);
      if (activeState !== null) {
        where.is_active = activeState;
      }
    }

    if (featured !== undefined && featured !== '') {
      const featuredState = parseBoolean(featured);
      if (featuredState !== null) {
        where.is_featured = featuredState;
      }
    }
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${sanitizeInput(search)}%` } },
        { description: { [Op.iLike]: `%${sanitizeInput(search)}%` } }
      ];
    }

    if (category) {
      where.category_id = parseInt(category);
    }

    // Fetch products
    const { rows, count } = await Product.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        { model: Category, attributes: ['id', 'name', 'slug'] }
      ]
    });

    res.json({
      success: true,
      data: rows,
      total: count,
      pages: Math.ceil(count / limitNum),
      message: 'Products retrieved successfully'
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// POST: Import products from spreadsheet template (admin only)
exports.importProductsFromTemplate = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Import file is required'
      });
    }

    const overwriteExisting = parseBoolean(req.body.overwrite_existing) === true;
    const previewOnly = parseBoolean(req.body.preview_only) === true;

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) {
      return res.status(400).json({
        success: false,
        message: 'No worksheet found in the uploaded file'
      });
    }

    const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {
      header: 1,
      defval: '',
      raw: false
    });

    if (!matrix.length) {
      return res.status(400).json({
        success: false,
        message: 'Template has no rows'
      });
    }

    const headerRowIndex = matrix.findIndex((row) => isTemplateHeaderRow(row));
    if (headerRowIndex < 0) {
      return res.status(400).json({
        success: false,
        message: 'Template headers do not match Nhap-khau-hang-hoa-website.xlsx format'
      });
    }

    const rows = matrix.slice(headerRowIndex + 1).filter((row) =>
      Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== '')
    );

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: 'Template has no data rows after header'
      });
    }

    const headerMap = TEMPLATE_HEADERS.reduce((result, header, index) => {
      if (header) {
        result[header] = index;
      }
      return result;
    }, {});

    const categories = await Category.findAll({ attributes: ['id', 'name', 'slug'] });
    const categoriesById = new Map(categories.map((category) => [category.id, category.id]));
    const categoriesByName = new Map(categories.map((category) => [normalizeHeader(category.name), category.id]));
    const categoriesBySlug = new Map(categories.map((category) => [normalizeHeader(category.slug), category.id]));

    const summary = {
      total_rows: rows.length,
      preview_only: previewOnly,
      would_create: 0,
      would_update: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: []
    };

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNumber = headerRowIndex + index + 2;

      try {
        const skuRaw = row[headerMap.SKUCode];
        const nameRaw = row[headerMap.InventoryItemName];
        const categoryCodeRaw = row[headerMap.ItemCategoryCode];
        const categoryNameRaw = row[headerMap.ItemCategoryName];
        const brandRaw = row[headerMap.BrandName];
        const unitRaw = row[headerMap.UnitName];
        const colorRaw = row[headerMap.Color];
        const sizeRaw = row[headerMap.Size];
        const priceRaw = row[headerMap.UnitPrice];
        const vatRaw = row[headerMap.TaxRate];
        const stockRaw = row[headerMap.OpeningQuantity];
        const openingStockRaw = row[headerMap.OpeningStockName];

        const name = toOptionalString(nameRaw);
        const placeholderName = normalizeHeader(name);
        const isInstructionRow = placeholderName.includes('tenhanghoa') || placeholderName.includes('inventoryitemname');
        if (isInstructionRow) {
          continue;
        }

        if (!name) {
          summary.skipped += 1;
          summary.errors.push(`Row ${rowNumber}: Missing product name`);
          continue;
        }

        const price = toNumber(priceRaw, null);
        if (price === null || price <= 0) {
          summary.skipped += 1;
          summary.errors.push(`Row ${rowNumber}: Invalid price for "${name}"`);
          continue;
        }

        const stock = Math.max(0, Math.trunc(toNumber(stockRaw, 0)));
        const vatPercent = Math.max(0, Math.trunc(toNumber(vatRaw, 0)));
        const sku = toOptionalString(skuRaw);
        const slugValue = slugify(name);

        let categoryId = null;
        const parsedCategoryId = toNumber(categoryCodeRaw, null);
        const categoryCodeKey = normalizeHeader(categoryCodeRaw);
        const categoryNameKey = normalizeHeader(categoryNameRaw);

        if (parsedCategoryId && categoriesById.has(parsedCategoryId)) {
          categoryId = parsedCategoryId;
        } else {
          categoryId = categoriesBySlug.get(categoryCodeKey)
            || categoriesBySlug.get(categoryNameKey)
            || categoriesByName.get(categoryNameKey)
            || null;
        }

        const descriptionParts = [
          toOptionalString(brandRaw) ? `Brand: ${toOptionalString(brandRaw)}` : null,
          toOptionalString(colorRaw) ? `Color: ${toOptionalString(colorRaw)}` : null,
          toOptionalString(sizeRaw) ? `Size: ${toOptionalString(sizeRaw)}` : null,
          toOptionalString(openingStockRaw) ? `Opening stock location: ${toOptionalString(openingStockRaw)}` : null
        ].filter(Boolean);

        let existingProduct = null;
        if (sku) {
          existingProduct = await Product.findOne({ where: { sku } });
        }

        if (!existingProduct) {
          existingProduct = await Product.findOne({ where: { slug: slugValue } });
        }

        const payload = {
          name,
          description: descriptionParts.length ? descriptionParts.join(' | ') : null,
          price,
          stock,
          unit: toOptionalString(unitRaw) || 'Chiếc',
          vat_percent: vatPercent,
          category_id: categoryId,
          image_url: null,
          is_featured: false,
          is_active: true,
          slug: slugValue,
          sku
        };

        if (existingProduct) {
          if (!overwriteExisting) {
            summary.skipped += 1;
            summary.errors.push(`Row ${rowNumber}: Product exists (${existingProduct.name}), skipped`);
            continue;
          }

          summary.would_update += 1;

          if (previewOnly) {
            continue;
          }

          await existingProduct.update(payload);
          summary.updated += 1;
          continue;
        }

        summary.would_create += 1;

        if (previewOnly) {
          continue;
        }

        await Product.create(payload);
        summary.created += 1;
      } catch (rowError) {
        summary.failed += 1;
        summary.errors.push(`Row ${rowNumber}: ${rowError.message}`);
      }
    }

    if (summary.errors.length > 50) {
      summary.errors = summary.errors.slice(0, 50);
      summary.errors.push('More errors were omitted.');
    }

    res.json({
      success: true,
      data: summary,
      message: previewOnly ? 'Import preview completed' : 'Product import completed'
    });
  } catch (error) {
    console.error('Import products error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// POST: Bulk delete products (admin only)
exports.bulkDeleteProducts = async (req, res) => {
  try {
    const rawIds = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const ids = rawIds
      .map((id) => parseInt(id, 10))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (!ids.length) {
      return res.status(400).json({
        success: false,
        message: 'Product ids are required'
      });
    }

    const products = await Product.findAll({ where: { id: { [Op.in]: ids } } });
    const foundIds = new Set(products.map((product) => product.id));
    const notFoundIds = ids.filter((id) => !foundIds.has(id));

    for (const product of products) {
      await deleteImage(product.image_url);
      const productImages = await ProductImage.findAll({
        where: { product_id: product.id },
        attributes: ['id', 'image_url']
      });
      for (const image of productImages) {
        await deleteImage(image.image_url);
      }

      await product.destroy();
    }

    res.json({
      success: true,
      data: {
        requested: ids.length,
        deleted: products.length,
        not_found_ids: notFoundIds
      },
      message: 'Bulk delete completed'
    });
  } catch (error) {
    console.error('Bulk delete products error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET: Single product by slug
exports.getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const product = await Product.findOne({
      where: { slug, is_active: true },
      include: [
        { model: Category, attributes: ['id', 'name', 'slug'] },
        { model: ProductImage, attributes: ['id', 'image_url', 'alt_text', 'display_order'] }
      ]
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product,
      message: 'Product retrieved successfully'
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// POST: Create product (admin only)
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, stock, unit, vat_percent, category_id, is_featured, is_active, image_url, product_link } = req.body;

    // Validate input
    if (!name || !price) {
      return res.status(400).json({
        success: false,
        message: 'Name and price are required'
      });
    }

    const nameClean = sanitizeInput(name);
    const priceNum = parseFloat(price);
    const stockNum = parseInt(stock) || 0;
    const vatPercentNum = vat_percent !== undefined && vat_percent !== '' ? parseInt(vat_percent) || 0 : 0;

    if (priceNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be greater than 0'
      });
    }

    // Generate slug
    const slug = slugify(nameClean);

    // Check if slug already exists
    const existingProduct = await Product.findOne({ where: { slug } });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'A product with this name already exists'
      });
    }

    // Process image if provided
    let imageUrl = null;
    if (req.file) {
      try {
        const imageResult = await processProductImage(req.file.buffer, req.file.originalname);
        imageUrl = imageResult.url;
      } catch (imageError) {
        return res.status(400).json({
          success: false,
          message: `Image processing failed: ${imageError.message}`
        });
      }
    } else if (image_url) {
      imageUrl = sanitizeInput(image_url);
    }

    // Create product
    const product = await Product.create({
      name: nameClean,
      description: sanitizeInput(description),
      price: priceNum,
      stock: stockNum,
      unit: sanitizeInput(unit || 'Chiếc'),
      vat_percent: vatPercentNum,
      category_id: category_id ? parseInt(category_id) : null,
      slug,
      image_url: imageUrl,
      is_featured: is_featured === 'true' || is_featured === true,
      product_link: product_link ? sanitizeInput(product_link) : null
    });

    res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// PUT: Update product (admin only)
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock, unit, vat_percent, category_id, is_featured, is_active, image_url, product_link } = req.body;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Validate price if provided
    if (price && parseFloat(price) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be greater than 0'
      });
    }

    if (vat_percent !== undefined && vat_percent !== '' && parseInt(vat_percent) < 0) {
      return res.status(400).json({
        success: false,
        message: 'VAT percent must be zero or greater'
      });
    }

    // Update image if provided
    let imageUrl = product.image_url;
    if (req.file) {
      try {
        // Delete old image
        await deleteImage(product.image_url);
        // Process new image
        const imageResult = await processProductImage(req.file.buffer, req.file.originalname);
        imageUrl = imageResult.url;
      } catch (imageError) {
        return res.status(400).json({
          success: false,
          message: `Image processing failed: ${imageError.message}`
        });
      }
    } else if (image_url) {
      imageUrl = sanitizeInput(image_url);
    }

    // Update product
    const updateData = {
      ...(name && { name: sanitizeInput(name) }),
      ...(description && { description: sanitizeInput(description) }),
      ...(price && { price: parseFloat(price) }),
      ...(stock !== undefined && { stock: parseInt(stock) || 0 }),
      ...(unit !== undefined && { unit: sanitizeInput(unit || 'Chiếc') }),
      ...(vat_percent !== undefined && { vat_percent: parseInt(vat_percent) || 0 }),
      ...(category_id !== undefined && { category_id: category_id ? parseInt(category_id) : null }),
      ...(imageUrl && { image_url: imageUrl }),
      ...(is_featured !== undefined && { is_featured: is_featured === 'true' || is_featured === true }),
      ...(is_active !== undefined && { is_active: is_active === 'true' || is_active === true }),
      ...(product_link !== undefined && { product_link: product_link ? sanitizeInput(product_link) : null })
    };

    // Save the updated product
    await product.update(updateData);

    res.json({
      success: true,
      data: product,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// DELETE: Delete product (admin only)
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete associated images
    await deleteImage(product.image_url);
    const productImages = await ProductImage.findAll({
      where: { product_id: id },
      attributes: ['id', 'image_url']
    });
    for (const img of productImages) {
      await deleteImage(img.image_url);
    }

    // Delete product
    await product.destroy();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
