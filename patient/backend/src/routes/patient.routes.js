/**
 * patient.routes.js - All API routes for the patient portal
 */
const express = require('express');
const router = express.Router();

const { register, login, getProfile, updateProfile, changePassword } = require('../controllers/patient.auth.controller');
const { uploadReport, getReports, getReport, deleteReport, downloadReport, getStats } = require('../controllers/patient.report.controller');
const { getLabReports, downloadLabReport, getTrendData, extractAnalyzeLabReport } = require('../controllers/patient.labreports.controller');
const { analyzeReport, getAnalysis } = require('../controllers/patient.analysis.controller');
const { enhancedAnalyzeReport } = require('../controllers/patient.enhanced.analysis.controller');
const { patientChat } = require('../controllers/patient.chatbot.controller');
const { createAppointmentRequest } = require('../controllers/patient.appointment.controller');
const patientAuthMiddleware = require('../middleware/patient.middleware');
const patientUpload = require('../middleware/patient.upload.middleware');

// ─── Public routes ──────────────────────────────────────────────────────────
router.post('/patient/register', register);
router.post('/patient/login', login);

// ─── Protected routes (patient only) ─────────────────────────────────────────
router.use('/patient', patientAuthMiddleware);

// Profile
router.get('/patient/profile', getProfile);
router.put('/patient/profile', updateProfile);
router.put('/patient/change-password', changePassword);

// Dashboard Stats
router.get('/patient/stats', getStats);

// Reports
router.get('/patient/reports', getReports);
router.get('/patient/reports/:id', getReport);
router.post('/patient/reports/upload', patientUpload.single('file'), uploadReport);
router.delete('/patient/reports/:id', deleteReport);
router.get('/patient/reports/:id/download', downloadReport);

// Lab reports (from admin upload - by registration_number + name)
router.get('/patient/lab-reports', getLabReports);
router.get('/patient/lab-reports/:id/download', downloadLabReport);
router.post('/patient/lab-reports/:id/extract-analyze', extractAnalyzeLabReport);
router.get('/patient/trend-data', getTrendData);

// Analysis
router.post('/patient/reports/:id/analyze', analyzeReport);
router.post('/patient/reports/:id/enhanced-analyze', enhancedAnalyzeReport);
router.get('/patient/reports/:id/analysis', getAnalysis);

// AI Medical Assistant Chat
router.post('/patient/chat', patientChat);
router.post('/patient/appointments', createAppointmentRequest);

module.exports = router;
