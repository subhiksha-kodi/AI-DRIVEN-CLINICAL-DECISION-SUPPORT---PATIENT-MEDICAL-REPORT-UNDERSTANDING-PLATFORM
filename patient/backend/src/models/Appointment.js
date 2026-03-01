const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Appointment = sequelize.define('Appointment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  patient_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  patient_name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  registration_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  doctor_name: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  time: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'cancelled'),
    defaultValue: 'pending',
  },
  original_message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'appointments',
  timestamps: true,
  underscored: true,
});

module.exports = Appointment;

