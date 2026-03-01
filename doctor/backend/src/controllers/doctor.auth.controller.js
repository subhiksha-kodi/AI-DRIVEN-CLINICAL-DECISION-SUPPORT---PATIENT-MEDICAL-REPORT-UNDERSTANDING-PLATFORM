/**
 * doctor.auth.controller.js - Doctor registration and login
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Doctor = require('../models/Doctor');

/**
 * POST /api/doctor/register
 * Register a new doctor account (status = pending)
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, medical_license_id, specialization, phone } = req.body;

    // Validate required fields
    if (!name || !email || !password || !medical_license_id) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and medical license ID are required.',
      });
    }

    // Check if email already exists
    const existingEmail = await Doctor.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered.',
      });
    }

    // Check if medical license ID already exists
    const existingLicense = await Doctor.findOne({ where: { medical_license_id } });
    if (existingLicense) {
      return res.status(400).json({
        success: false,
        message: 'Medical License ID is already registered.',
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Create doctor with pending status
    const doctor = await Doctor.create({
      name,
      email,
      password_hash,
      medical_license_id,
      specialization: specialization || null,
      phone: phone || null,
      approval_status: 'pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please wait for admin approval before logging in.',
      data: {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        medical_license_id: doctor.medical_license_id,
        approval_status: doctor.approval_status,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/doctor/login
 * Doctor login - only allowed if approved
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    // Find doctor by email
    const doctor = await Doctor.findOne({ where: { email } });
    if (!doctor) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    // Check approval status
    if (doctor.approval_status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending approval. Please wait for admin to approve.',
      });
    }

    if (doctor.approval_status === 'rejected') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been rejected. Please contact support.',
      });
    }

    // Validate password
    const isValid = await doctor.validatePassword(password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: doctor.id, email: doctor.email, name: doctor.name, role: 'doctor' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      doctor: {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        medical_license_id: doctor.medical_license_id,
        specialization: doctor.specialization,
        phone: doctor.phone,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/doctor/profile
 * Get current doctor's profile
 */
const getProfile = async (req, res, next) => {
  try {
    const doctor = await Doctor.findByPk(req.doctor.id, {
      attributes: { exclude: ['password_hash'] },
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.',
      });
    }

    return res.json({
      success: true,
      data: doctor,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/doctor/profile
 * Update current doctor's profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, specialization, phone } = req.body;
    const doctor = await Doctor.findByPk(req.doctor.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.',
      });
    }

    // Update fields
    if (name) doctor.name = name;
    if (specialization !== undefined) doctor.specialization = specialization;
    if (phone !== undefined) doctor.phone = phone;

    await doctor.save();

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        medical_license_id: doctor.medical_license_id,
        specialization: doctor.specialization,
        phone: doctor.phone,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/doctor/change-password
 * Change doctor's password
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

    const doctor = await Doctor.findByPk(req.doctor.id);

    // Verify current password
    const isValid = await doctor.validatePassword(current_password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    // Hash and save new password
    doctor.password_hash = await bcrypt.hash(new_password, 12);
    await doctor.save();

    return res.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getProfile, updateProfile, changePassword };
