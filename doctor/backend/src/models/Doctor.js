/**
 * Doctor model - Manages doctor accounts and approval workflow
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');

const Doctor = sequelize.define('Doctor', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: { notEmpty: true },
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  medical_license_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  specialization: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  approval_status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },
}, {
  tableName: 'doctors',
  timestamps: true,
  underscored: true,
});

// Instance method to compare password
Doctor.prototype.validatePassword = async function (password) {
  if (!this.password_hash) return false;
  return bcrypt.compare(password, this.password_hash);
};

module.exports = Doctor;
