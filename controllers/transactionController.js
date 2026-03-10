const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../db');
const portService = require('../services/portService');
const smsService = require('../services/smsService');
require('dotenv').config();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Amount to port and duration mapping
const AMOUNT_CONFIG = {
  10: { output_port: 1, duration_seconds: 10 },
  20: { output_port: 2, duration_seconds: 20 },
  30: { output_port: 3, duration_seconds: 30 }
};

/**
 * Create a new transaction and Razorpay order
 * POST /create-transaction
 */
const createTransaction = async (req, res) => {
  try {
    const { amount, phone_number } = req.body;

    // Validate amount
    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Amount is required'
      });
    }

    // Validate phone number (optional but recommended)
    if (phone_number && !/^\+?[1-9]\d{1,14}$/.test(phone_number)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format. Use international format (e.g., +919876543210)'
      });
    }

    // Check if amount is valid (10, 20, or 30)
    if (!AMOUNT_CONFIG[amount]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Must be 10, 20, or 30'
      });
    }

    const { output_port, duration_seconds } = AMOUNT_CONFIG[amount];

    // Create Razorpay order (amount in paise)
    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        output_port: output_port,
        duration_seconds: duration_seconds
      }
    });

    // Insert transaction into database
    const query = `
      INSERT INTO transactions 
      (amount, output_port, duration_seconds, payment_status, phone_number, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, amount, output_port, duration_seconds, payment_status, phone_number, created_at
    `;

    const values = [amount, output_port, duration_seconds, 'PENDING', phone_number || null];
    const result = await db.query(query, values);
    const transaction = result.rows[0];

    // Return response
    res.json({
      success: true,
      order_id: razorpayOrder.id,
      amount: amount,
      transaction_id: transaction.id,
      output_port: output_port,
      duration_seconds: duration_seconds,
      razorpay_key_id: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create transaction',
      message: error.message
    });
  }
};

/**
 * Verify Razorpay payment and activate power port
 * POST /verify-payment
 */
const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      transaction_id
    } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !transaction_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Verify Razorpay signature
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment signature'
      });
    }

    // Get transaction details from database
    const getTransactionQuery = 'SELECT * FROM transactions WHERE id = $1';
    const transactionResult = await db.query(getTransactionQuery, [transaction_id]);

    if (transactionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    const transaction = transactionResult.rows[0];

    // Check if already processed
    if (transaction.payment_status === 'SUCCESS') {
      return res.status(400).json({
        success: false,
        error: 'Payment already verified'
      });
    }

    // Calculate end time
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + (transaction.duration_seconds * 1000));

    // Update transaction in database
    const updateQuery = `
      UPDATE transactions 
      SET payment_status = $1, start_time = $2, end_time = $3
      WHERE id = $4
      RETURNING *
    `;

    const updateValues = ['SUCCESS', startTime, endTime, transaction_id];
    const updateResult = await db.query(updateQuery, updateValues);
    const updatedTransaction = updateResult.rows[0];

    // Activate port
    try {
      const activationResult = await portService.activatePort(
        transaction.output_port,
        transaction.duration_seconds
      );

      // Send SMS notification (don't fail if SMS fails)
      let smsResult = null;
      if (updatedTransaction.phone_number) {
        try {
          smsResult = await smsService.sendPaymentSuccessSMS(
            updatedTransaction.phone_number,
            updatedTransaction.amount,
            updatedTransaction.duration_seconds
          );
          if (!smsResult.success) {
            console.error('⚠️  SMS failed but transaction continues:', smsResult.error);
          }
        } catch (smsError) {
          console.error('⚠️  SMS error but transaction continues:', smsError.message);
        }
      }

      // Return success response
      res.json({
        success: true,
        message: 'Payment verified and power activated',
        transaction: {
          id: updatedTransaction.id,
          amount: updatedTransaction.amount,
          payment_status: updatedTransaction.payment_status,
          start_time: updatedTransaction.start_time,
          end_time: updatedTransaction.end_time
        },
        activation: {
          message: 'Power Activated',
          port: activationResult.port,
          duration: activationResult.duration
        },
        sms: smsResult ? {
          sent: smsResult.success,
          provider: smsResult.provider
        } : {
          sent: false,
          reason: 'No phone number provided'
        }
      });

    } catch (portError) {
      // Port activation failed
      return res.status(400).json({
        success: false,
        error: portError.error || 'Port activation failed',
        message: portError.message
      });
    }

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment',
      message: error.message
    });
  }
};

module.exports = {
  createTransaction,
  verifyPayment
};
