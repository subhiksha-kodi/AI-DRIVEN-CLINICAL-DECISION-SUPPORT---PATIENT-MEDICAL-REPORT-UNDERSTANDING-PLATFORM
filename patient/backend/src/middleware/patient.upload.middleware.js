/**
 * patient.upload.middleware.js - Multer configuration for patient file uploads
 * Supports all file types
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure patient uploads directory exists
const patientUploadDir = path.join(__dirname, '../../uploads/patient-reports');
if (!fs.existsSync(patientUploadDir)) {
  fs.mkdirSync(patientUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, patientUploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize and prefix with timestamp and patient id for uniqueness
    const safeFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = `patient_${req.patient.id}_${Date.now()}-${safeFilename}`;
    cb(null, uniqueName);
  },
});

// Accept all file types
const fileFilter = (req, file, cb) => {
  // Allow all file types
  cb(null, true);
};

const patientUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max
  },
});

module.exports = patientUpload;
