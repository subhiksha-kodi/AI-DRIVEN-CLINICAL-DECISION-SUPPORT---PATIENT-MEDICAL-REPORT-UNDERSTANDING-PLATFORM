const Appointment = require('../models/Appointment');
const { sendSms } = require('../services/sms.service');

/**
 * Create appointment request from patient portal.
 * Stored as 'pending' for admin to review/assign doctor.
 */
const createAppointmentRequest = async (req, res, next) => {
  try {
    const { message = '', date, time, doctor, reason, phone } = req.body || {};
    if (!date || !time || !doctor || !reason || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Date, time, doctor, reason and phone are required.',
      });
    }

    const payload = {
      patient_id: req.patient?.id || null,
      patient_name: req.patient?.name || 'Patient',
      registration_number: req.patient?.registration_number || null,
      doctor_name: doctor,
      date,
      time,
      reason,
      phone,
      original_message: message,
      status: 'pending',
    };

    const appointment = await Appointment.create(payload);

    return res.json({
      success: true,
      data: {
        appointment,
      },
    });
  } catch (err) {
    next(err);
  }
};

const listAppointmentsForAdmin = async (req, res, next) => {
  try {
    const appointments = await Appointment.findAll({
      order: [['created_at', 'DESC']],
    });
    return res.json({
      success: true,
      data: appointments,
    });
  } catch (err) {
    next(err);
  }
};

const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, doctor_name } = req.body || {};

    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (status) appointment.status = status;
    if (doctor_name) appointment.doctor_name = doctor_name;
    await appointment.save();

    // When confirmed, notify patient via SMS
    if (appointment.status === 'confirmed') {
      await sendSms(
        appointment.phone,
        `Your appointment is confirmed on ${appointment.date} at ${appointment.time} with ${appointment.doctor_name || 'the doctor'}.`
      );
    }

    return res.json({
      success: true,
      data: appointment,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createAppointmentRequest,
  listAppointmentsForAdmin,
  updateAppointmentStatus,
};

