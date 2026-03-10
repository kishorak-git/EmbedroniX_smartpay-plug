require('dotenv').config();
const Razorpay = require('razorpay');
const crypto = require('crypto');

let razorpayInstance = null;
let isRazorpayAvailable = false;

// Initialize Razorpay
try {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (keyId && keySecret && keyId !== 'rzp_test_demo') {
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
    isRazorpayAvailable = true;
    console.log('✅ Razorpay payment gateway initialized');
  } else {
    console.log('⚠️  Razorpay not configured (using simulation mode)');
  }
} catch (error) {
  console.log('⚠️  Razorpay initialization failed:', error.message);
}

class RazorpayService {
  // Create Razorpay order
  async createOrder(amount, transactionId, customerDetails = {}) {
    if (!isRazorpayAvailable || !razorpayInstance) {
      // Simulation mode - return mock order
      return {
        simulated: true,
        id: 'order_' + Date.now(),
        amount: amount * 100, // paise
        currency: 'INR',
        receipt: transactionId,
        status: 'created'
      };
    }

    try {
      const options = {
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        receipt: transactionId,
        notes: {
          transaction_id: transactionId,
          ...customerDetails
        }
      };

      const order = await razorpayInstance.orders.create(options);
      console.log(`✅ Razorpay order created: ${order.id} for ₹${amount}`);

      return order;
    } catch (error) {
      console.error('❌ Razorpay order creation failed:', error);
      throw new Error('Failed to create payment order: ' + error.message);
    }
  }

  // Verify payment signature
  verifyPaymentSignature(orderId, paymentId, signature) {
    if (!isRazorpayAvailable) {
      // Simulation mode - always return true
      console.log('⚠️  [SIMULATION] Payment signature verified');
      return true;
    }

    try {
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      const body = orderId + '|' + paymentId;

      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');

      const isValid = expectedSignature === signature;

      if (isValid) {
        console.log(`✅ Payment signature verified for order: ${orderId}`);
      } else {
        console.error(`❌ Invalid payment signature for order: ${orderId}`);
      }

      return isValid;
    } catch (error) {
      console.error('❌ Payment verification failed:', error);
      return false;
    }
  }

  // Verify webhook signature
  verifyWebhookSignature(body, signature) {
    if (!isRazorpayAvailable) {
      return true; // Simulation mode
    }

    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.warn('⚠️  Webhook secret not configured');
        return true; // Allow in dev mode
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(body))
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('❌ Webhook verification failed:', error);
      return false;
    }
  }

  // Fetch payment details
  async fetchPayment(paymentId) {
    if (!isRazorpayAvailable || !razorpayInstance) {
      // Simulation mode
      return {
        simulated: true,
        id: paymentId,
        status: 'captured',
        method: 'upi',
        amount: 1000
      };
    }

    try {
      const payment = await razorpayInstance.payments.fetch(paymentId);
      console.log(`✅ Payment fetched: ${paymentId} - Status: ${payment.status}`);
      return payment;
    } catch (error) {
      console.error('❌ Failed to fetch payment:', error);
      throw new Error('Failed to fetch payment details');
    }
  }

  // Capture payment (for authorized payments)
  async capturePayment(paymentId, amount) {
    if (!isRazorpayAvailable || !razorpayInstance) {
      return { simulated: true, status: 'captured' };
    }

    try {
      const capture = await razorpayInstance.payments.capture(
        paymentId,
        amount * 100 // paise
      );
      console.log(`✅ Payment captured: ${paymentId}`);
      return capture;
    } catch (error) {
      console.error('❌ Payment capture failed:', error);
      throw new Error('Failed to capture payment');
    }
  }

  // Get payments by order ID
  async getPaymentsByOrder(orderId) {
    if (!isRazorpayAvailable || !razorpayInstance) {
      // Simulation mode
      return {
        simulated: true,
        items: []
      };
    }

    try {
      const payments = await razorpayInstance.orders.fetchPayments(orderId);
      console.log(`✅ Fetched ${payments.items?.length || 0} payments for order: ${orderId}`);
      return payments;
    } catch (error) {
      console.error('❌ Failed to fetch payments for order:', error);
      throw new Error('Failed to fetch order payments');
    }
  }

  // Create Payment Link with QR Code support
  async createPaymentLink(amount, transactionId, customerDetails = {}) {
    if (!isRazorpayAvailable || !razorpayInstance) {
      // Simulation mode - return UPI payment string
      const upiId = process.env.UPI_ID || 'ajayajay1910206@oksbi';
      const upiUrl = `upi://pay?pa=${upiId}&pn=SmartPayPlug&am=${amount}.00&tn=Transaction%20${transactionId}&cu=INR`;

      return {
        simulated: true,
        id: 'plink_' + Date.now(),
        short_url: upiUrl,
        upi_link: upiUrl,
        amount: amount * 100,
        currency: 'INR',
        description: `Power Port Payment - ₹${amount}`,
        customer: customerDetails,
        notify: {
          sms: false,
          email: false
        }
      };
    }

    try {
      const options = {
        amount: amount * 100, // paise
        currency: 'INR',
        description: `SmartPayPlug Power - ₹${amount}`,
        customer: {
          name: customerDetails.name || 'Customer',
          contact: customerDetails.phoneNumber || '',
          email: customerDetails.email || ''
        },
        notify: {
          sms: !!customerDetails.phoneNumber,
          email: !!customerDetails.email
        },
        reminder_enable: false,
        notes: {
          transaction_id: transactionId,
          port: customerDetails.port || 0,
          duration: customerDetails.duration || 0
        },
        callback_url: process.env.PAYMENT_CALLBACK_URL || process.env.FRONTEND_URL || 'http://localhost:3000/payment',
        callback_method: 'get'
      };

      const paymentLink = await razorpayInstance.paymentLink.create(options);
      console.log(`✅ Payment Link created: ${paymentLink.short_url} for ₹${amount}`);

      return paymentLink;
    } catch (error) {
      console.error('❌ Payment Link creation failed:', error);

      // Fallback to UPI string if payment link fails
      const upiId = process.env.UPI_ID || 'ajayajay1910206@oksbi';
      const upiUrl = `upi://pay?pa=${upiId}&pn=SmartPayPlug&am=${amount}.00&tn=Transaction%20${transactionId}&cu=INR`;

      return {
        simulated: true,
        short_url: upiUrl,
        upi_link: upiUrl,
        amount: amount * 100,
        currency: 'INR',
        fallback: true
      };
    }
  }

  // Get Razorpay credentials for frontend
  getCredentials() {
    return {
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_demo',
      keySecret: process.env.RAZORPAY_KEY_SECRET || 'demo_secret',
      isLive: isRazorpayAvailable,
      currency: 'INR'
    };
  }

  // Check if Razorpay is available
  isAvailable() {
    return isRazorpayAvailable;
  }
}

// Create singleton instance
const razorpayService = new RazorpayService();

module.exports = razorpayService;
