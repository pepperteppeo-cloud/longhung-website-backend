const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

const uploadDir = process.env.UPLOAD_DIR || './public/uploads';

// Process and optimize product image
const processProductImage = async (fileBuffer, originalName) => {
  try {
    // Create unique filename
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    const filename = `product-${timestamp}-${random}.webp`;
    const filepath = path.join(uploadDir, filename);

    // Ensure directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    // Resize and convert to WebP (reduces size by 70-80%)
    await sharp(fileBuffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toFile(filepath);

    return {
      filename,
      url: `/uploads/${filename}`,
      path: filepath
    };
  } catch (error) {
    throw new Error(`Image processing failed: ${error.message}`);
  }
};

// Delete image file
const deleteImage = async (filepath) => {
  try {
    if (filepath && filepath.startsWith('/uploads/')) {
      const fullPath = path.join(uploadDir, path.basename(filepath));
      await fs.unlink(fullPath).catch(() => {});
    }
  } catch (error) {
    console.error('Delete image error:', error);
  }
};

module.exports = {
  processProductImage,
  deleteImage
};
