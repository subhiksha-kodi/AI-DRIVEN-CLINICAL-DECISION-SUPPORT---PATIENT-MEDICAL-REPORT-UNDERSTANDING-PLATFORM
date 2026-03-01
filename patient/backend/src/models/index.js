/**
 * index.js - Models index: initializes all models and associations
 */
const Admin = require('./Admin');
const Doctor = require('./Doctor');
const Report = require('./Report');
const EhrPatient = require('./EhrPatient');
const Patient = require('./Patient');
const PatientReport = require('./PatientReport');

// Associations
Doctor.hasMany(Report, { foreignKey: 'doctor_id', as: 'reports' });
Report.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });

// Patient associations
Patient.hasMany(PatientReport, { foreignKey: 'patient_id', as: 'patientReports' });
PatientReport.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

module.exports = { Admin, Doctor, Report, EhrPatient, Patient, PatientReport };
