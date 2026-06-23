const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './public/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Store files in memory (will process with sharp)
const storage = multer.memoryStorage();

// File filter - only allow specific image types
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, and GIF images allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 }
});

const spreadsheetFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/csv'
  ];

  const isAllowedMime = allowedMimes.includes(file.mimetype);
  const hasAllowedExtension = /\.(xlsx|xls|csv)$/i.test(file.originalname || '');

  if (isAllowedMime || hasAllowedExtension) {
    cb(null, true);
  } else {
    cb(new Error('Only XLSX, XLS, or CSV files are allowed'), false);
  }
};

const uploadSpreadsheetOnly = multer({
  storage,
  fileFilter: spreadsheetFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 }
});

module.exports = {
  uploadSingle: upload.single('image'),
  uploadMultiple: upload.array('images', 5),
  uploadSpreadsheet: uploadSpreadsheetOnly.single('file')
};
