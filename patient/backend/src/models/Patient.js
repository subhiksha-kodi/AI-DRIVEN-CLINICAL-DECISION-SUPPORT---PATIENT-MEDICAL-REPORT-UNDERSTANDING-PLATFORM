/**
 * Patient model - Manages patient accounts for patient portal
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');

const Patient = sequelize.define('Patient', {
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
    allowNull: true,
    unique: true,
    validate: { isEmail: true },
  },
  registration_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: true,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'patients',
  timestamps: true,
  underscored: true,
});

// Instance method to compare password
Patient.prototype.validatePassword = async function (password) {
  if (!this.password_hash) return false;
  return bcrypt.compare(password, this.password_hash);
};

module.exports = Patient;
