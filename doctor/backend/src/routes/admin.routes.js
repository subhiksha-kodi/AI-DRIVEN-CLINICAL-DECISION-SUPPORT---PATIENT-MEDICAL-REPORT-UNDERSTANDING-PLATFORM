/**
 * admin.routes.js - All API routes for the admin dashboard
 */
const express = require('express');
const router = express.Router();

const { login } = require('../controllers/auth.controller');
const { getStats, uploadReport, getReports, deleteReport } = require('../controllers/dashboard.controller');
const { getDoctors, approveDoctor, rejectDoctor, getApprovedDoctors } = require('../controllers/doctor.controller');
const { getPatients } = require('../controllers/patient.controller');
const {
  uploadEhrExcel,
  getEhrPatients,
  updateEhrPatient,
  addEhrPatient,
  deleteEhrPatient,
  bulkUpdateEhrPatients,
  getEhrColumns,
} = require('../controllers/ehr.controller');
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// ─── Auth routes (public) ─────────────────────────────────────────────────────
router.post('/admin/login', login);

// ─── Protected routes (admin only) ───────────────────────────────────────────
// Apply auth middleware only to /admin/* routes
router.use('/admin', authMiddleware);

// Dashboard
router.get('/admin/stats', getStats);
router.post('/admin/upload', upload.single('file'), uploadReport);
router.get('/admin/reports', getReports);
router.delete('/admin/report/:id', deleteReport);

// Doctors
router.get('/admin/doctors', getDoctors);
router.get('/admin/doctors/approved', getApprovedDoctors);
router.put('/admin/doctor/:id/approve', approveDoctor);
router.put('/admin/doctor/:id/reject', rejectDoctor);

// Patients (aggregated from reports)
router.get('/admin/patients', getPatients);

// EHR Analysis
router.post('/admin/ehr/upload', upload.single('file'), uploadEhrExcel);
router.get('/admin/ehr/patients', getEhrPatients);
router.get('/admin/ehr/columns', getEhrColumns);
router.post('/admin/ehr/patient', addEhrPatient);
router.put('/admin/ehr/patient/:id', updateEhrPatient);
router.delete('/admin/ehr/patient/:id', deleteEhrPatient);
router.put('/admin/ehr/bulk-update', bulkUpdateEhrPatients);

module.exports = router;
