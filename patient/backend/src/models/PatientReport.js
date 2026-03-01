/**
 * PatientReport model - Stores files uploaded by patients
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PatientReport = sequelize.define('PatientReport', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  patient_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'patients',
      key: 'id',
    },
  },
  original_filename: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  stored_filename: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  file_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  mime_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  analysis_result: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  analysis_status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    defaultValue: 'pending',
  },
}, {
  tableName: 'patient_reports',
  timestamps: true,
  underscored: true,
});

module.exports = PatientReport;
