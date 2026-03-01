/**
 * patient.auth.controller.js - Patient registration and login
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Patient = require('../models/Patient');

/**
 * POST /api/patient/register
 * Register a new patient account
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, date_of_birth, gender, address } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    // Check if email already exists
    const existingEmail = await Patient.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered.',
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Create patient (email and password required for register)
    const patient = await Patient.create({
      name,
      email,
      password_hash,
      phone: phone || null,
      date_of_birth: date_of_birth || null,
      gender: gender || null,
      address: address || null,
    });

    // Generate JWT
    const token = jwt.sign(
      { id: patient.id, email: patient.email, name: patient.name, role: 'patient', registration_number: patient.registration_number || null },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        date_of_birth: patient.date_of_birth,
        gender: patient.gender,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/patient/login
 * Patient login - supports (email + password) OR (registration_number + name as password)
 */
const login = async (req, res, next) => {
  try {
    const { email, password, registration_number, name } = req.body;

    let patient = null;

    // Login with registration number + name (name acts as password)
    if (registration_number != null && registration_number !== '' && name != null && name !== '') {
      patient = await Patient.findOne({
        where: { registration_number: registration_number.trim() },
      });
      if (!patient) {
        return res.status(401).json({
          success: false,
          message: 'Invalid register number or name.',
        });
      }
      const isValid = await patient.validatePassword(name.trim());
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid register number or name.',
        });
      }
    } else if (email && password) {
      // Login with email + password
      patient = await Patient.findOne({ where: { email } });
      if (!patient) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials.',
        });
      }
      const isValid = await patient.validatePassword(password);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials.',
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Provide either (email and password) or (registration_number and name).',
      });
    }

    // Generate JWT (include registration_number for lab reports)
    const tokenPayload = {
      id: patient.id,
      email: patient.email,
      name: patient.name,
      role: 'patient',
      registration_number: patient.registration_number || null,
    };
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        date_of_birth: patient.date_of_birth,
        gender: patient.gender,
        registration_number: patient.registration_number || null,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/patient/profile
 * Get current patient's profile
 */
const getProfile = async (req, res, next) => {
  try {
    const patient = await Patient.findByPk(req.patient.id, {
      attributes: { exclude: ['password_hash'] },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found.',
      });
    }

    return res.json({
      success: true,
      data: patient,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/patient/profile
 * Update current patient's profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, date_of_birth, gender, address } = req.body;
    const patient = await Patient.findByPk(req.patient.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found.',
      });
    }

    // Update fields
    if (name) patient.name = name;
    if (phone !== undefined) patient.phone = phone;
    if (date_of_birth !== undefined) patient.date_of_birth = date_of_birth;
    if (gender !== undefined) patient.gender = gender;
    if (address !== undefined) patient.address = address;

    await patient.save();

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        date_of_birth: patient.date_of_birth,
        gender: patient.gender,
        address: patient.address,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/patient/change-password
 * Change patient's password
 */
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }

    const patient = await Patient.findByPk(req.patient.id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found.',
      });
    }

    // Verify current password
    const isValid = await patient.validatePassword(current_password);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    // Hash and update password
    patient.password_hash = await bcrypt.hash(new_password, 12);
    await patient.save();

    return res.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getProfile, updateProfile, changePassword };
