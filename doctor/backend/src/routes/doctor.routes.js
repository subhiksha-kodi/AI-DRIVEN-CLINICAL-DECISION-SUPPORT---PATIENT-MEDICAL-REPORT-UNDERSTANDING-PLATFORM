/**
 * doctor.routes.js - All API routes for the doctor portal
 */
const express = require('express');
const router = express.Router();

const { register, login, getProfile, updateProfile, changePassword } = require('../controllers/doctor.auth.controller');
const { getStats, getReports, getReportById, markAsReviewed, getPatients, getTrendData } = require('../controllers/doctor.dashboard.controller');
const { extractAndAnalyze, getReportAlerts, getHighRiskReports } = require('../controllers/extraction.controller');
const { generateSummary, getRiskSummary } = require('../controllers/summary.controller');
const { analyzePatient, searchPatient } = require('../controllers/doctor.ehr.controller');
const doctorAuthMiddleware = require('../middleware/doctor.middleware');
const authMiddleware = require('../middleware/auth.middleware');

// ─── Public routes ──────────────────────────────────────────────────────────
router.post('/doctor/register', register);
router.post('/doctor/login', login);

// ─── Protected routes (doctor only) ─────────────────────────────────────────
// Apply doctor middleware to specific routes only
router.get('/doctor/profile', doctorAuthMiddleware, getProfile);
router.put('/doctor/profile', doctorAuthMiddleware, updateProfile);
router.put('/doctor/change-password', doctorAuthMiddleware, changePassword);

// Dashboard & Reports - apply unified auth middleware for both admin and doctor access
router.get('/doctor/stats', doctorAuthMiddleware, getStats);
router.get('/doctor/reports', doctorAuthMiddleware, getReports);
router.get('/doctor/high-risk-reports', doctorAuthMiddleware, getHighRiskReports);
router.get('/doctor/report/:id', doctorAuthMiddleware, getReportById);
router.get('/doctor/report/:id/alerts', doctorAuthMiddleware, getReportAlerts);
router.put('/doctor/report/:id/reviewed', doctorAuthMiddleware, markAsReviewed);
router.put('/doctor/report/:id/extract', doctorAuthMiddleware, extractAndAnalyze);
// Summary endpoints (rule-based + Gemini explanation)
router.post('/doctor/report/:id/summary', doctorAuthMiddleware, generateSummary);
router.get('/doctor/report/:id/risk', doctorAuthMiddleware, getRiskSummary);
router.get('/doctor/patients', doctorAuthMiddleware, getPatients);
router.get('/doctor/trend-data', doctorAuthMiddleware, getTrendData);

// EHR Analysis
router.post('/doctor/ehr/analyze', analyzePatient);
router.get('/doctor/ehr/search', searchPatient);

module.exports = router;

