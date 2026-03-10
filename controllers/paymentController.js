const db = require('../db');
const razorpayService = require('../services/razorpayService');
const esp32Service = require('../services/esp32Service');
const gpioService = require('../services/portService');
const smsService = require('../services/smsService');

// Amount to port/duration mapping
const PAYMENT_CONFIG = {
  10: { port: 1, duration: 10 },
  20: { port: 2, duration: 20 },
  30: { port: 3, duration: 30 }
};

// Choose hardware service (ESP32 or GPIO)
const hardwareService = process.env.ESP32_ENABLED === 'true' ? esp32Service : gpioService;

class PaymentController {
  // Create Razorpay order
  async createOrder(req, res) {
    try {
      const { amount, phoneNumber, email, name } = req.body;

      // Validate amount
      if (![10, 20, 30].includes(parseInt(amount))) {
        return res.status(400).json({
          success: false,
          error: 'Invalid amount. Must be 10, 20, or 30'
        });
      }

      const config = PAYMENT_CONFIG[amount];

      // Check if port/relay is available
      const status = hardwareService.getRelayStatus 
        ? hardwareService.getRelayStatus(config.port)
        : hardwareService.getPortStatus(config.port);
        
      if (status.active) {
        return res.status(409).json({
          success: false,
          error: `Port ${config.port} is currently in use. Please try again in ${status.remainingTime} seconds.`,
          remainingTime: status.remainingTime
        });
      }

      // Create transaction in database
      const query = `
        INSERT INTO transactions 
        (phone_number, amount, output_port, duration_seconds, payment_status, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id, amount, output_port, duration_seconds, payment_status, phone_number, created_at
      `;
      const values = [phoneNumber || null, parseInt(amount), config.port, config.duration, 'PENDING'];
      const result = await db.query(query, values);
      const transaction = result.rows[0];

      // Create Razorpay order
      const order = await razorpayService.createOrder(
        parseInt(amount),
        transaction.id,
        { phoneNumber, email, name }
      );

      // Create Payment Link with QR Code support
      const paymentLink = await razorpayService.createPaymentLink(
        parseInt(amount),
        transaction.id,
        { 
          phoneNumber, 
          email, 
          name,
          port: config.port,
          duration: config.duration
        }
      );

      // Set auto-cancel timer (5 minutes)
      setTimeout(async () => {
        const findQuery = 'SELECT * FROM transactions WHERE id = $1';
        const findResult = await db.query(findQuery, [transaction.id]);
        const currentTransaction = findResult.rows[0];
        if (currentTransaction && currentTransaction.payment_status === 'PENDING') {
          const updateQuery = 'UPDATE transactions SET payment_status = $1 WHERE id = $2';
          await db.query(updateQuery, ['FAILED', transaction.id]);
          console.log(`❌ Transaction ${transaction.id} auto-cancelled (timeout)`);
        }
      }, 5 * 60 * 1000);

      res.status(201).json({
        success: true,
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          outputPort: transaction.output_port,
          duration: transaction.duration_seconds,
          status: transaction.payment_status,
          createdAt: transaction.created_at
        },
        order: {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency || 'INR',
          simulated: order.simulated || false
        },
        paymentLink: {
          url: paymentLink.short_url || paymentLink.upi_link,
          upiLink: paymentLink.upi_link || paymentLink.short_url,
          qrCodeData: paymentLink.short_url || paymentLink.upi_link,
          simulated: paymentLink.simulated || false,
          fallback: paymentLink.fallback || false
        },
        razorpayKey: razorpayService.getCredentials().keyId
      });
    } catch (error) {
      console.error('❌ Create order error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create payment order: ' + error.message
      });
    }
  }

  // Verify payment and activate hardware
  async verifyPayment(req, res) {
    try {
      const {
        transactionId,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      } = req.body;

      if (!transactionId) {
        return res.status(400).json({
          success: false,
          error: 'Transaction ID is required'
        });
      }

      // Find transaction
      const findQuery = 'SELECT * FROM transactions WHERE id = $1';
      const findResult = await db.query(findQuery, [transactionId]);
      const transaction = findResult.rows[0];

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }

      // Check if already processed
      if (transaction.payment_status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          error: `Transaction already ${transaction.payment_status.toLowerCase()}`
        });
      }

      // Verify payment signature
      let isValid = true;
      if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
        isValid = razorpayService.verifyPaymentSignature(
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature
        );
      }

      if (!isValid) {
        const updateQuery = 'UPDATE transactions SET payment_status = $1 WHERE id = $2';
        await db.query(updateQuery, ['FAILED', transactionId]);
        return res.status(400).json({
          success: false,
          error: 'Payment verification failed. Invalid signature.'
        });
      }

      // Check if port is still available
      const status = hardwareService.getRelayStatus 
        ? hardwareService.getRelayStatus(transaction.output_port)
        : hardwareService.getPortStatus(transaction.output_port);
        
      if (status.active) {
        const updateQuery = 'UPDATE transactions SET payment_status = $1 WHERE id = $2';
        await db.query(updateQuery, ['FAILED', transactionId]);
        return res.status(409).json({
          success: false,
          error: `Port ${transaction.output_port} is currently in use`,
          remainingTime: status.remainingTime
        });
      }

      // Activate transaction
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + (transaction.duration_seconds * 1000));
      const activateQuery = `
        UPDATE transactions 
        SET payment_status = $1, start_time = $2, end_time = $3
        WHERE id = $4
        RETURNING *
      `;
      const activateResult = await db.query(activateQuery, ['SUCCESS', startTime, endTime, transactionId]);
      const activatedTransaction = activateResult.rows[0];

      // Activate hardware (ESP32 or GPIO)
      const activateMethod = hardwareService.activateRelay || hardwareService.activatePort;
      activateMethod.call(hardwareService,
        transaction.output_port,
        transaction.duration_seconds
      ).then(async () => {
        // Hardware deactivated, transaction already completed via end_time
        console.log(`✅ Transaction ${transactionId} completed`);
      }).catch(async (error) => {
        console.error(`❌ Hardware activation failed for transaction ${transactionId}:`, error);
        const updateQuery = 'UPDATE transactions SET payment_status = $1 WHERE id = $2';
        await db.query(updateQuery, ['FAILED', transactionId]);
      });

      // Send SMS notification
      if (transaction.phone_number) {
        smsService.sendPaymentConfirmation(
          transaction.phone_number,
          transaction.amount,
          transaction.duration_seconds
        ).catch(error => {
          console.error('SMS notification failed:', error);
        });
      }

      res.status(200).json({
        success: true,
        message: 'Payment verified and power activated',
        transaction: {
          id: activatedTransaction.id,
          amount: activatedTransaction.amount,
          outputPort: activatedTransaction.output_port,
          duration: activatedTransaction.duration_seconds,
          status: activatedTransaction.payment_status,
          startTime: activatedTransaction.start_time
        },
        paymentId: razorpay_payment_id
      });
    } catch (error) {
      console.error('❌ Verify payment error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify payment: ' + error.message
      });
    }
  }

  // Webhook handler for Razorpay
  async handleWebhook(req, res) {
    try {
      const signature = req.headers['x-razorpay-signature'];
      const body = req.body;

      // Verify webhook signature
      const isValid = razorpayService.verifyWebhookSignature(body, signature);
      
      if (!isValid) {
        console.error('❌ Invalid webhook signature');
        return res.status(400).json({ error: 'Invalid signature' });
      }

      const event = body.event;
      const payload = body.payload.payment.entity;

      console.log(`📥 Webhook received: ${event}`);

      // Handle payment.captured event
      if (event === 'payment.captured') {
        const notes = payload.notes || {};
        const transactionId = notes.transaction_id;

        if (transactionId) {
          // Auto-verify and activate
          await this.verifyPayment(
            { body: { transactionId, razorpay_payment_id: payload.id } },
            { status: () => ({ json: () => {} }) } // Mock response
          );
        }
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('❌ Webhook error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get Razorpay config for frontend
  async getConfig(req, res) {
    try {
      const credentials = razorpayService.getCredentials();
      res.status(200).json({
        success: true,
        config: credentials
      });
    } catch (error) {
      console.error('❌ Get config error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get payment config'
      });
    }
  }

  // Test Razorpay connection
  async testConnection(req, res) {
    try {
      const credentials = razorpayService.getCredentials();
      
      // Check if credentials exist
      if (!credentials.keyId || !credentials.keySecret) {
        return res.status(500).json({
          success: false,
          connected: false,
          error: 'Razorpay credentials not configured in environment variables'
        });
      }

      // Try to fetch a dummy order to test connection
      try {
        const testOrder = await razorpayService.createOrder(1, 'test-connection', {});
        
        res.status(200).json({
          success: true,
          connected: true,
          message: 'Razorpay is properly configured and connected',
          keyId: credentials.keyId,
          testMode: credentials.keyId.startsWith('rzp_test_')
        });
      } catch (apiError) {
        res.status(500).json({
          success: false,
          connected: false,
          error: 'Razorpay API error: ' + apiError.message,
          keyId: credentials.keyId
        });
      }
    } catch (error) {
      console.error('❌ Test connection error:', error);
      res.status(500).json({
        success: false,
        connected: false,
        error: error.message
      });
    }
  }

  // Check payment status by order ID or transaction ID
  async checkPaymentStatus(req, res) {
    try {
      const { orderId, transactionId } = req.query;

      if (!orderId && !transactionId) {
        return res.status(400).json({
          success: false,
          error: 'Either orderId or transactionId is required'
        });
      }

      let transaction;
      
      if (transactionId) {
        const findQuery = 'SELECT * FROM transactions WHERE id = $1';
        const findResult = await db.query(findQuery, [transactionId]);
        transaction = findResult.rows[0];
      }

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }

      // If payment is already successful, return status
      if (transaction.payment_status === 'SUCCESS') {
        return res.status(200).json({
          success: true,
          paid: true,
          transaction: {
            id: transaction.id,
            status: transaction.payment_status,
            amount: transaction.amount,
            port: transaction.output_port,
            duration: transaction.duration_seconds,
            startTime: transaction.start_time
          }
        });
      }

      // Try to fetch payment status from Razorpay if order ID is provided
      if (orderId) {
        try {
          const payments = await razorpayService.getPaymentsByOrder(orderId);
          
          if (payments && payments.items && payments.items.length > 0) {
            const capturedPayment = payments.items.find(p => p.status === 'captured');
            
            if (capturedPayment) {
              // Payment found! Auto-verify it
              const startTime = new Date();
              const endTime = new Date(startTime.getTime() + (transaction.duration_seconds * 1000));
              const updateQuery = `
                UPDATE transactions 
                SET payment_status = $1, start_time = $2, end_time = $3
                WHERE id = $4
              `;
              await db.query(updateQuery, ['SUCCESS', startTime, endTime, transaction.id]);
              
              return res.status(200).json({
                success: true,
                paid: true,
                transaction: {
                  id: transaction.id,
                  status: 'SUCCESS',
                  amount: transaction.amount,
                  port: transaction.output_port,
                  duration: transaction.duration_seconds
                },
                payment: {
                  id: capturedPayment.id,
                  method: capturedPayment.method,
                  createdAt: capturedPayment.created_at
                }
              });
            }
          }
        } catch (apiError) {
          console.log('⚠️ Could not fetch payment from Razorpay:', apiError.message);
        }
      }

      // Payment not completed yet
      res.status(200).json({
        success: true,
        paid: false,
        transaction: {
          id: transaction.id,
          status: transaction.payment_status,
          amount: transaction.amount,
          port: transaction.output_port,
          duration: transaction.duration_seconds
        }
      });
    } catch (error) {
      console.error('❌ Check payment status error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new PaymentController();
