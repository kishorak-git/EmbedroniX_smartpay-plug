# SmartPayPlug - Razorpay Integration Guide

This guide covers the complete setup of Razorpay payment gateway integration with SmartPayPlug.

## Table of Contents
1. [Razorpay Account Setup](#razorpay-account-setup)
2. [Configuration](#configuration)
3. [Payment Flow](#payment-flow)
4. [Testing](#testing)
5. [Production Deployment](#production-deployment)
6. [Webhook Configuration](#webhook-configuration)
7. [Troubleshooting](#troubleshooting)

## Razorpay Account Setup

### Step 1: Create Razorpay Account
1. Visit: https://razorpay.com/
2. Click "Sign Up" and create account
3. Complete KYC verification (for production)
4. Navigate to Dashboard

### Step 2: Get API Credentials

#### Test Mode Credentials (for development)
1. In Razorpay Dashboard, go to **Settings → API Keys**
2. Click "Generate Test Key" if not already generated
3. Copy:
   - **Key ID**: `rzp_test_XXXXXXXXXXXX`
   - **Key Secret**: `xxxxxxxxxxxxxxxxxx` (click "Show" to reveal)

#### Production Credentials (for live payments)
1. Complete KYC and activate your account
2. Go to **Settings → API Keys**
3. Click "Generate Live Key"
4. Copy Live Key ID and Secret

**Security Warning:** Never commit API keys to version control! Use environment variables.

## Configuration

### Backend Environment Variables

Update `backend/.env`:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_SNEIKYwZuMBTL0
RAZORPAY_KEY_SECRET=T8jL3KEz0O4ma5AWojcDFUkD

# For production, use live keys:
# RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXX
# RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxx
```

### Frontend Configuration

No additional configuration needed - the frontend fetches Razorpay Key ID from backend via `/payment-config` endpoint.

## Payment Flow

### Complete Flow Diagram

```
User → Homepage (Enter Details + Select Plan)
  ↓
  → Click "Proceed to Pay"
  ↓
  → Frontend: Call /create-order API
  ↓
  → Backend: Create Razorpay Order + Database Transaction
  ↓
  → Frontend: Receive Order ID + Navigate to Payment Page
  ↓
  → Payment Page: Load Razorpay Checkout SDK
  ↓
  → Razorpay Checkout: User completes payment (UPI/Card/Wallet)
  ↓
  → On Success: Razorpay returns payment_id, order_id, signature
  ↓
  → Frontend: Call /verify-payment-razorpay API
  ↓
  → Backend: Verify signature + Update database + Activate relay
  ↓
  → Payment Verified: Show success + Countdown timer
  ↓
  → ESP32/Hardware: Relay activates for specified duration
  ↓
  → Timer Expires: Relay deactivates automatically
```

### API Endpoints

#### 1. Create Order
**Endpoint:** `POST /api/create-order`

**Request:**
```json
{
  "amount": 10,
  "phoneNumber": "+919876543210",
  "email": "customer@example.com",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "order_XXXXXXXXXXXXX",
  "amount": 10,
  "currency": "INR",
  "transactionId": "uuid-here",
  "razorpayKey": "rzp_test_XXXXXXXXXXXX",
  "customerDetails": {
    "phone": "+919876543210",
    "email": "customer@example.com",
    "name": "John Doe"
  }
}
```

#### 2. Verify Payment
**Endpoint:** `POST /api/verify-payment-razorpay`

**Request:**
```json
{
  "transactionId": "uuid-here",
  "razorpay_order_id": "order_XXXXXXXXXXXXX",
  "razorpay_payment_id": "pay_XXXXXXXXXXXXX",
  "razorpay_signature": "signature-hash"
}
```

**Response:**
```json
{
  "success": true,
  "transaction": {
    "id": "uuid-here",
    "amount": 10,
    "port": 1,
    "duration": 10,
    "payment_status": "SUCCESS"
  },
  "relayActivated": true
}
```

#### 3. Webhook Handler
**Endpoint:** `POST /api/webhook/razorpay`

**Headers:**
```
X-Razorpay-Signature: signature-hash
```

**Payload:** Razorpay webhook event (JSON)

## Testing

### Test Mode

Razorpay provides test mode for development without real money transactions.

#### Test Payment Credentials

**Test Cards:**
```
Card Number: 4111 1111 1111 1111
CVV: Any 3 digits
Expiry: Any future date
Name: Any name
```

**Test UPI:**
```
UPI ID: success@razorpay
(Use this for successful payment)

UPI ID: failure@razorpay
(Use this for failed payment)
```

**Test Wallet:**
```
Phone: Any 10-digit number
OTP: 0000 (always)
```

### Manual Testing Steps

1. **Start Backend Server**
   ```bash
   cd backend
   npm start
   ```

2. **Start Frontend Server**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Open Application**
   - Navigate to: http://localhost:3000

4. **Complete Payment Flow**
   - Enter customer details (name, phone, email)
   - Select a plan (₹10, ₹20, or ₹30)
   - Click "Proceed to Pay"
   - Use test credentials in Razorpay Checkout
   - Complete payment
   - Verify relay activation and countdown

5. **Check Backend Logs**
   ```
   ✓ Razorpay order created: order_XXXXX
   ✓ Payment verified successfully: pay_XXXXX
   ✓ ESP32 relay 1 activated for 10 seconds
   ```

### Automated Testing

Create test script `test-payment.js`:

```javascript
const axios = require('axios');

async function testPaymentFlow() {
  try {
    // 1. Create Order
    const orderResponse = await axios.post('http://localhost:5000/api/create-order', {
      amount: 10,
      phoneNumber: '+919876543210',
      email: 'test@example.com',
      name: 'Test User'
    });
    
    console.log('✓ Order created:', orderResponse.data.orderId);
    
    // 2. Simulate payment (in real scenario, user completes via Razorpay)
    // For testing, you'd need to use Razorpay's test environment
    
    console.log('Payment flow test completed');
  } catch (error) {
    console.error('✗ Test failed:', error.response?.data || error.message);
  }
}

testPaymentFlow();
```

Run: `node test-payment.js`

## Webhook Configuration

Webhooks allow Razorpay to notify your server about payment events in real-time.

### Setup Webhooks

1. **In Razorpay Dashboard:**
   - Go to **Settings → Webhooks**
   - Click "Add New Webhook"

2. **Webhook URL:**
   ```
   https://yourdomain.com/api/webhook/razorpay
   ```
   
   For testing with localhost, use ngrok:
   ```bash
   ngrok http 5000
   # Use ngrok URL: https://xxxx-xx-xx-xx-xx.ngrok.io/api/webhook/razorpay
   ```

3. **Active Events:**
   - Select: `payment.captured`
   - Select: `payment.failed`
   - Select: `order.paid`

4. **Webhook Secret:**
   - Copy the webhook secret
   - Add to `.env`:
   ```env
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
   ```

5. **Save Webhook**

### Test Webhook

Razorpay provides webhook testing:
1. Go to webhook settings
2. Click "Send Test Webhook"
3. Select event: `payment.captured`
4. Check backend logs for webhook processing

## Production Deployment

### Pre-Deployment Checklist

- [ ] KYC verification completed on Razorpay
- [ ] Live API keys generated
- [ ] Webhook configured with production URL
- [ ] SSL certificate installed (HTTPS required)
- [ ] Environment variables updated
- [ ] Database backup configured
- [ ] Error logging and monitoring setup
- [ ] Rate limiting implemented
- [ ] Payment reconciliation process defined

### Update Environment Variables

```env
# Production Razorpay Keys
RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXX
RAZORPAY_KEY_SECRET=your_live_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

# Production Database
DATABASE_URL=postgresql://user:pass@production-db.com:5432/smartpayplug

# Production ESP32
ESP32_ENABLED=true
ESP32_IP=10.0.1.100
ESP32_PORT=80

# Environment
NODE_ENV=production
```

### Security Best Practices

1. **HTTPS Only:**
   - Never use HTTP in production
   - All payment data must be transmitted over HTTPS

2. **Signature Verification:**
   - Always verify Razorpay signatures
   - Already implemented in `razorpayService.js`

3. **Webhook Security:**
   - Verify webhook signatures
   - Use webhook secret from Razorpay dashboard

4. **API Key Protection:**
   - Never expose secret keys in frontend
   - Use environment variables
   - Rotate keys periodically

5. **Rate Limiting:**
   - Implement rate limiting on payment endpoints
   - Prevent abuse and fraud attempts

6. **Logging:**
   - Log all payment attempts
   - Monitor for suspicious activity
   - Keep audit trail

### Deployment Steps

1. **Deploy Backend:**
   ```bash
   # Build backend
   cd backend
   npm install --production
   
 # Start with PM2
   pm2 start server.js --name smartpayplug-backend
   pm2 save
   ```

2. **Deploy Frontend:**
   ```bash
   # Build frontend
   cd frontend
   npm install
   npm run build
   
   # Start production server
   npm start
   ```

3. **Verify Deployment:**
   - Test payment flow end-to-end
   - Verify webhook delivery
   - Check ESP32 connectivity
   - Monitor server logs

## Troubleshooting

### Payment Creation Fails

**Error:** "Order creation failed"

**Solutions:**
1. Check Razorpay API credentials in `.env`
2. Verify Razorpay account is active
3. Check backend logs for detailed error
4. Ensure amount is valid (minimum ₹1)

### Payment Verification Fails

**Error:** "Payment verification failed"

**Solutions:**
1. Check signature verification logic
2. Ensure correct secret key is used
3. Verify razorpay_order_id, razorpay_payment_id, and razorpay_signature are sent
4. Check backend console for HMAC mismatch errors

### Webhook Not Received

**Causes:**
1. Incorrect webhook URL
2. Server not publicly accessible
3. Firewall blocking requests
4. HTTPS certificate issues

**Solutions:**
1. Verify webhook URL in Razorpay dashboard
2. Use ngrok for local testing
3. Check server firewall rules
4. Ensure valid SSL certificate

### Razorpay Checkout Not Loading

**Solutions:**
1. Check browser console for errors
2. Verify Razorpay script loaded: `https://checkout.razorpay.com/v1/checkout.js`
3. Ensure Key ID is correct in `options.key`
4. Check for ad blockers blocking Razorpay

### Payment Successful but Relay Not Activating

**Solutions:**
1. Check ESP32 connection (ESP32_ENABLED, ESP32_IP)
2. Verify ESP32 is online: `curl http://ESP32_IP/status`
3. Check backend logs for relay activation
4. Test ESP32 directly with cURL
5. Verify GPIO wiring on ESP32

## Monitoring & Analytics

### Track Payment Metrics

Razorpay Dashboard provides:
- Total payments received
- Success/failure rates
- Payment methods breakdown
- Settlement details
- Refund management

### Database Queries for Analytics

```sql
-- Total revenue
SELECT SUM(amount) FROM transactions WHERE payment_status = 'SUCCESS';

-- Payments by status
SELECT payment_status, COUNT(*) FROM transactions GROUP BY payment_status;

-- Revenue by port/plan
SELECT 
  CASE 
    WHEN amount = 10 THEN 'Plan 1 (₹10)'
    WHEN amount = 20 THEN 'Plan 2 (₹20)'
    WHEN amount = 30 THEN 'Plan 3 (₹30)'
  END as plan,
  COUNT(*) as count,
  SUM(amount) as revenue
FROM transactions 
WHERE payment_status = 'SUCCESS'
GROUP BY amount;

-- Payments in last 24 hours
SELECT COUNT(*), SUM(amount) 
FROM transactions 
WHERE created_at > NOW() - INTERVAL '24 hours'
AND payment_status = 'SUCCESS';
```

## Support & Resources

### Razorpay Documentation
- API Docs: https://razorpay.com/docs/api/
- Checkout Docs: https://razorpay.com/docs/payment-gateway/web-integration/standard/
- Webhooks: https://razorpay.com/docs/webhooks/

### SmartPayPlug Resources
- Main README: `../README.md`
- Hardware Setup: `../hardware/README.md`
- API Documentation: `../API.md`

### Getting Help
1. Check Razorpay Dashboard: https://dashboard.razorpay.com/
2. Razorpay Support: https://razorpay.com/contact/
3. SmartPayPlug Issues: Check GitHub repository

---

**Last Updated:** 2024  
**Version:** 1.0.0
