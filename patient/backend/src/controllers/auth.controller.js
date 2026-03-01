/**
 * auth.controller.js - Admin login and token generation
 */
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

/**
 * POST /api/admin/login
 * Authenticates admin and returns JWT token
 */
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    // Find admin by username
    const admin = await Admin.findOne({ where: { username } });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Validate password
    const isValid = await admin.validatePassword(password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      admin: { id: admin.id, username: admin.username },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { login };
