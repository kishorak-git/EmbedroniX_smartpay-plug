const twilio = require('twilio');
require('dotenv').config();

// Initialize Twilio client
let twilioClient = null;

// Check if Twilio is configured
const isTwilioConfigured = () => {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
};

// Initialize client if configured
if (isTwilioConfigured()) {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  console.log('✅ Twilio SMS service initialized');
} else {
  console.log('⚠️  Twilio not configured - SMS will be simulated');
}

/**
 * Send SMS notification
 * @param {string} phoneNumber - Recipient phone number (with country code)
 * @param {string} message - SMS message content
 * @returns {Promise<Object>} Result of SMS send
 */
const sendSMS = async (phoneNumber, message) => {
  try {
    // If Twilio is configured, send real SMS
    if (twilioClient && isTwilioConfigured()) {
      const result = await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      console.log(`📱 SMS sent to ${phoneNumber}: ${result.sid}`);
      return {
        success: true,
        provider: 'twilio',
        sid: result.sid,
        message: 'SMS sent successfully'
      };
    } else {
      // Simulate SMS sending (for testing without Twilio)
      console.log(`📱 [SIMULATED] SMS to ${phoneNumber}: ${message}`);
      return {
        success: true,
        provider: 'simulated',
        message: 'SMS simulated successfully'
      };
    }
  } catch (error) {
    console.error('❌ SMS sending failed:', error.message);
    // Return error but don't throw - we don't want to break the transaction
    return {
      success: false,
      error: error.message,
      message: 'SMS sending failed'
    };
  }
};

/**
 * Send payment success SMS
 * @param {string} phoneNumber - Customer phone number
 * @param {number} amount - Payment amount
 * @param {number} duration - Power duration in seconds
 * @returns {Promise<Object>} SMS result
 */
const sendPaymentConfirmation = async (phoneNumber, amount, duration) => {
  const message = `SmartPayPlug: ₹${amount} received. Power activated for ${duration} seconds. Thank you.`;
  return await sendSMS(phoneNumber, message);
};

module.exports = {
  sendSMS,
  sendPaymentConfirmation,
  isTwilioConfigured
};
