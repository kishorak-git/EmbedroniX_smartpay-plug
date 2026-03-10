const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const portController = require('../controllers/portController');
const adminController = require('../controllers/adminController');
const paymentController = require('../controllers/paymentController');
const esp32Service = require('../services/esp32Service');
const paymentMethodService = require('../services/paymentMethodService');

// Payment routes (Razorpay integration)
router.post('/create-order', paymentController.createOrder);
router.post('/verify-payment-razorpay', paymentController.verifyPayment);
router.post('/webhook/razorpay', paymentController.handleWebhook);
router.get('/payment-config', paymentController.getConfig);
router.get('/test-razorpay', paymentController.testConnection);
router.get('/check-payment-status', paymentController.checkPaymentStatus);

// Transaction routes (Legacy + Current)
router.post('/create-transaction', transactionController.createTransaction);
router.post('/verify-payment', transactionController.verifyPayment);

// Port status route
router.get('/port-status', portController.getPortStatus);

// ===== NEW: UPI QR Code Routes =====
// Get static UPI QR data for all payment amounts
router.get('/upi-qr', async (req, res) => {
    try {
        const activeMethod = await paymentMethodService.getActiveUpi();
        const upiId = activeMethod.upi_id;
        const merchantName = activeMethod.merchant_name;

        const amounts = [10, 20, 30];
        const qrData = {};
        amounts.forEach(amount => {
            qrData[amount] = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}.00&tn=SmartPayPlug%20Power%20${amount}s&cu=INR`;
        });
        res.json({ success: true, upiId, merchantName, qrData });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin: Block a UPI ID
router.post('/admin/block-upi', async (req, res) => {
    try {
        const { upiId } = req.body;
        if (!upiId) return res.status(400).json({ success: false, error: 'upiId is required' });

        const success = await paymentMethodService.blockUpi(upiId);
        if (success) {
            res.json({ success: true, message: `UPI ID ${upiId} blocked successfully` });
        } else {
            res.status(404).json({ success: false, error: 'UPI ID not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== NEW: ESP32 Live Status Route =====
router.get('/esp32-status', async (req, res) => {
    try {
        const info = await esp32Service.getSystemInfo();
        const relayStatus = esp32Service.getAllRelayStatus();

        res.json({
            success: true,
            esp32: info,
            relays: relayStatus
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== NEW: Device Registration (called by ESP32) =====
router.post('/register-device', (req, res) => {
    const { ip, mac } = req.body;
    if (!ip || !mac) {
        return res.status(400).json({ success: false, error: 'ip and mac required' });
    }

    const success = esp32Service.registerDevice(ip, mac);
    if (success) {
        res.json({ success: true, message: 'Device registered successfully' });
    } else {
        res.status(403).json({ success: false, error: 'Unauthorized device MAC' });
    }
});

// ===== NEW: Direct Relay Activation (called after payment confirmation) =====
router.post('/activate-relay', async (req, res) => {
    try {
        const { relayNumber, duration, transactionId } = req.body;
        if (!relayNumber || !duration) {
            return res.status(400).json({ success: false, error: 'relayNumber and duration required' });
        }
        if (![1, 2, 3].includes(Number(relayNumber))) {
            return res.status(400).json({ success: false, error: 'Invalid relay number (must be 1, 2, or 3)' });
        }
        // Non-blocking relay activation
        esp32Service.activateRelay(Number(relayNumber), Number(duration)).catch(err => {
            console.error('Relay activation error:', err.message);
        });
        res.json({
            success: true,
            message: `Relay ${relayNumber} activated for ${duration} seconds`,
            relay: Number(relayNumber),
            duration: Number(duration),
            transactionId: transactionId || null
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin routes
router.get('/transactions', adminController.getAllTransactions);
router.get('/admin-summary', adminController.getAdminSummary);
router.post('/admin/reset-port', adminController.resetPort);

module.exports = router;
