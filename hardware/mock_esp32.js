const express = require('express');
const axios = require('axios');
const app = express();
const port = 80;

// Config
const MAC = 'FC:E8:C0:E1:76:8C';
const BACKEND_URL = 'http://localhost:5000/api/register-device';

let relayActive = false;
let relayTimeout = null;

app.get('/status', (req, res) => {
    res.json({
        mac: MAC,
        ip: 'localhost',
        relayActive: relayActive,
        uptime: process.uptime()
    });
});

app.get('/command', (req, res) => {
    const cmd = req.query.cmd;
    console.log(`[Mock ESP32] Received command: ${cmd}`);

    if (cmd && cmd.startsWith('PAY')) {
        const duration = parseInt(cmd.replace('PAY', ''));
        if (!isNaN(duration)) {
            relayActive = true;
            if (relayTimeout) clearTimeout(relayTimeout);

            console.log(`[Mock ESP32] Relay ON for ${duration}s`);
            relayTimeout = setTimeout(() => {
                relayActive = false;
                console.log(`[Mock ESP32] Relay OFF`);
            }, duration * 1000);

            return res.json({ success: true, message: `Relay ON for ${duration}s` });
        }
    }
    res.status(400).json({ success: false, error: 'Invalid command' });
});

app.listen(port, () => {
    console.log(`[Mock ESP32] Running on port ${port}`);
    console.log(`[Mock ESP32] MAC: ${MAC}`);

    // Register with backend
    register();
});

async function register() {
    try {
        await axios.post(BACKEND_URL, {
            ip: 'localhost',
            mac: MAC
        });
        console.log('[Mock ESP32] Registered with backend');
    } catch (err) {
        console.error('[Mock ESP32] Registration failed:', err.message);
    }
}
