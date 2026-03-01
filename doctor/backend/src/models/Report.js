/**
 * Report model - Stores uploaded laboratory report metadata
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Report = sequelize.define('Report', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  doctor_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'doctors',
      key: 'id',
    },
  },
  patient_name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: { notEmpty: true },
  },
  registration_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { notEmpty: true },
  },
  assigned_doctor: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: { notEmpty: true },
  },
  file_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  file_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  report_type: {
    type: DataTypes.ENUM('lab', 'prescription', 'other'),
    defaultValue: 'lab',
  },
  status: {
    type: DataTypes.ENUM('pending', 'reviewed'),
    defaultValue: 'pending',
  },
  extracted_data: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  ai_analysis: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  is_digital: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  uploaded_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'reports',
  timestamps: true,
  underscored: true,
});

module.exports = Report;
