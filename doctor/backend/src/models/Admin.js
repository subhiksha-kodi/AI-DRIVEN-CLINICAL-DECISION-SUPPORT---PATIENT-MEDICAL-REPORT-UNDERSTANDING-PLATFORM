/**
 * Admin model - platform administrators
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');

const Admin = sequelize.define('Admin', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: { notEmpty: true },
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
}, {
  tableName: 'admins',
  timestamps: true,
  underscored: true,
});

// Instance method to compare passwords
Admin.prototype.validatePassword = async function (password) {
  return bcrypt.compare(password, this.password_hash);
};

module.exports = Admin;
