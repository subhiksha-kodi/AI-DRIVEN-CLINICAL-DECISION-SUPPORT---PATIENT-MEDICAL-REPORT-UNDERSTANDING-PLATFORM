/**
 * doctor.routes.js - All API routes for the doctor portal
 */
const express = require('express');
const router = express.Router();

const { register, login, getProfile, updateProfile, changePassword } = require('../controllers/doctor.auth.controller');
const { getStats, getReports, getReportById, markAsReviewed, getPatients } = require('../controllers/doctor.dashboard.controller');
const { extractAndAnalyze } = require('../controllers/extraction.controller');
const { analyzePatient, searchPatient } = require('../controllers/doctor.ehr.controller');
const { extractAndAnalyzeDocument, quickAnalyzeDocument } = require('../controllers/gemini.extraction.controller');
const doctorAuthMiddleware = require('../middleware/doctor.middleware');
const authMiddleware = require('../middleware/auth.middleware');

// ─── Public routes ──────────────────────────────────────────────────────────
router.post('/doctor/register', register);
router.post('/doctor/login', login);

// ─── Protected routes (doctor only) ─────────────────────────────────────────
router.use('/doctor', doctorAuthMiddleware);

// Profile
router.get('/doctor/profile', getProfile);
router.put('/doctor/profile', updateProfile);
router.put('/doctor/change-password', changePassword);

// Dashboard & Reports
router.get('/doctor/stats', getStats);
router.get('/doctor/reports', getReports);
router.get('/doctor/report/:id', getReportById);
router.put('/doctor/report/:id/reviewed', markAsReviewed);
router.put('/doctor/report/:id/extract', extractAndAnalyze);
router.get('/doctor/patients', getPatients);

// EHR Analysis
router.post('/doctor/ehr/analyze', analyzePatient);
router.get('/doctor/ehr/search', searchPatient);
router.post('/doctor/ehr/extract-analyze', extractAndAnalyzeDocument);
router.post('/doctor/ehr/quick-analyze', quickAnalyzeDocument);

module.exports = router;
