/**
 * patient.middleware.js - JWT authentication middleware for patients
 */
const jwt = require('jsonwebtoken');

const patientAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure the token is for a patient
    if (decoded.role !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Patient access required.',
      });
    }

    req.patient = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

module.exports = patientAuthMiddleware;
