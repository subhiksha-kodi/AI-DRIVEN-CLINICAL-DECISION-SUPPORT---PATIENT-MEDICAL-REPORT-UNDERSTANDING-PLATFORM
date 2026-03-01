// sms.service.js
// Twilio authentication disabled as requested. This file keeps a stable
// interface so the rest of the codebase can call sendSms safely.

const HOSPITAL_NAME = process.env.HOSPITAL_NAME || 'Your Hospital';

/**
 * Stub SMS sender.
 * Currently SMS is disabled (no Twilio SID/secret). This function logs a message
 * and returns without throwing, so the backend never crashes even if called.
 */
const sendSms = async (to, body) => {
  console.warn(
    'SMS not sent: Twilio authentication is disabled. ' +
      'Remove this stub and integrate a provider (e.g. Twilio/MSG91) when ready.'
  );
};

module.exports = {
  sendSms,
  HOSPITAL_NAME,
};

