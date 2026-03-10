const fs = require('fs');
const path = require('path');
const db = require('../db');

const JSON_PATH = path.join(__dirname, '../payment_methods.json');

class PaymentMethodService {
    async getActiveUpi() {
        try {
            // Try database first
            const result = await db.query('SELECT * FROM payment_methods WHERE is_active = TRUE AND is_blocked = FALSE ORDER BY priority DESC, created_at ASC LIMIT 1');
            if (result.rows.length > 0) {
                return result.rows[0];
            }
        } catch (err) {
            console.warn('⚠️ Database query for payment methods failed, falling back to JSON:', err.message);
        }

        // Fallback to JSON
        try {
            if (fs.existsSync(JSON_PATH)) {
                const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
                const active = data.find(m => m.is_active && !m.is_blocked);
                if (active) return active;
            }
        } catch (err) {
            console.error('❌ JSON fallback failed:', err.message);
        }

        // Hardcoded default from .env
        return {
            upi_id: process.env.UPI_ID || 'ajayajay1910206@oksbi',
            merchant_name: 'SmartPayPlug'
        };
    }

    async blockUpi(upiId) {
        try {
            await db.query('UPDATE payment_methods SET is_blocked = TRUE WHERE upi_id = $1', [upiId]);
        } catch (err) {
            console.warn('⚠️ Database block failed, updating JSON:', err.message);
        }

        try {
            if (fs.existsSync(JSON_PATH)) {
                const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
                const index = data.findIndex(m => m.upi_id === upiId);
                if (index !== -1) {
                    data[index].is_blocked = true;
                    fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2));
                    return true;
                }
            }
        } catch (err) {
            console.error('❌ JSON block failed:', err.message);
        }
        return false;
    }

    async addPaymentMethod(upiId, merchantName, priority = 0) {
        const method = { upi_id: upiId, merchant_name: merchantName, is_active: true, is_blocked: false, priority };

        try {
            await db.query('INSERT INTO payment_methods (upi_id, merchant_name, priority) VALUES ($1, $2, $3) ON CONFLICT (upi_id) DO UPDATE SET merchant_name = $2, priority = $3', [upiId, merchantName, priority]);
        } catch (err) {
            console.warn('⚠️ Database add failed, updating JSON:', err.message);
        }

        try {
            let data = [];
            if (fs.existsSync(JSON_PATH)) {
                data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
            }
            const index = data.findIndex(m => m.upi_id === upiId);
            if (index !== -1) {
                data[index] = { ...data[index], ...method };
            } else {
                data.push({ ...method, id: Date.now() });
            }
            fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2));
            return true;
        } catch (err) {
            console.error('❌ JSON add failed:', err.message);
        }
        return false;
    }
}

module.exports = new PaymentMethodService();
