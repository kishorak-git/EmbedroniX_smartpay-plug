const axios = require('axios');

// Configuration
const REQUIRED_MAC = 'FC:E8:C0:E1:76:8C';
let ESP32_IP = process.env.ESP32_IP || '192.168.1.100';
const ESP32_PORT = process.env.ESP32_PORT || '8080';
let ESP32_ENABLED = process.env.ESP32_ENABLED === 'true';

class ESP32Service {
  constructor() {
    this.activeTimers = {};
    this.deviceMac = null;
    this.lastSeen = null;

    if (ESP32_ENABLED) {
      console.log(`✅ ESP32 controller enabled (Target MAC: ${REQUIRED_MAC})`);
      this.testConnection();
    } else {
      console.log('⚠️  ESP32 controller disabled (using simulation mode)');
    }
  }

  // Register or update ESP32 device
  registerDevice(ip, mac) {
    if (mac.toUpperCase() !== REQUIRED_MAC) {
      console.warn(`⚠️ Rejected unauthorized device: ${mac} at ${ip}`);
      return false;
    }

    ESP32_IP = ip;
    this.deviceMac = mac;
    this.lastSeen = new Date();
    ESP32_ENABLED = true;

    console.log(`✅ ESP32 device registered: ${mac} at ${ip}`);
    return true;
  }

  // Test ESP32 connection
  async testConnection() {
    if (!ESP32_ENABLED) return false;
    const baseUrl = `http://${ESP32_IP}:${ESP32_PORT}`;
    try {
      const response = await axios.get(`${baseUrl}/status`, {
        timeout: 3000
      });
      this.lastSeen = new Date();
      return true;
    } catch (error) {
      console.warn(`⚠️ ESP32 at ${ESP32_IP} is unreachable: ${error.message}`);
      return false;
    }
  }

  // Activate relay on ESP32 (Single Relay on GPIO25)
  async activateRelay(relayNumber, durationSeconds) {
    // Note: User specified command strings "PAY10", "PAY20", "PAY30"
    // and a single relay on GPIO25. We ignore relayNumber for the command string
    // but keep it for local tracking if needed.

    const command = `SIGNAL_${durationSeconds}`;
    console.log(`🔌 Sending command to ESP32: ${command}`);

    if (ESP32_ENABLED) {
      const baseUrl = `http://${ESP32_IP}:${ESP32_PORT}`;
      try {
        const response = await axios.get(`${baseUrl}/command?cmd=${command}`, {
          timeout: 5000
        });
        console.log(`✅ ESP32 Response:`, response.data);
      } catch (error) {
        console.error(`❌ ESP32 command failed:`, error.message);
      }
    } else {
      console.log(`⚠️  [SIMULATION] Sending ${command} (ESP32 disabled)`);
    }

    // Start local timer for dashboard synchronization
    const portId = 1; // Map all to port 1 logic for display
    if (this.activeTimers[portId]) {
      clearTimeout(this.activeTimers[portId].timeout);
    }

    return new Promise((resolve) => {
      this.activeTimers[portId] = {
        startTime: Date.now(),
        duration: durationSeconds * 1000,
        command: command,
        timeout: setTimeout(() => {
          this.deactivateRelay(portId);
          resolve();
        }, durationSeconds * 1000)
      };
    });
  }

  async deactivateRelay(portId) {
    if (this.activeTimers[portId]) {
      clearTimeout(this.activeTimers[portId].timeout);
      delete this.activeTimers[portId];
      console.log(`🔴 Relay session ${portId} completed`);
    }
  }

  getRelayStatus(portId) {
    if (!this.activeTimers[portId]) {
      return { active: false, remainingTime: 0 };
    }
    const timer = this.activeTimers[portId];
    const elapsed = Date.now() - timer.startTime;
    const remaining = Math.max(0, Math.ceil((timer.duration - elapsed) / 1000));
    return { active: true, remainingTime: remaining, command: timer.command };
  }

  getAllRelayStatus() {
    return {
      relay1: this.getRelayStatus(1),
      esp32Connected: ESP32_ENABLED,
      mac: REQUIRED_MAC,
      ip: ESP32_IP,
      lastSeen: this.lastSeen
    };
  }

  async getSystemInfo() {
    return {
      enabled: ESP32_ENABLED,
      requiredMac: REQUIRED_MAC,
      currentIp: ESP32_IP,
      lastSeen: this.lastSeen,
      online: await this.testConnection()
    };
  }

  async cleanup() {
    console.log('🧹 Cleaning up ESP32 services...');
    Object.keys(this.activeTimers).forEach(id => clearTimeout(this.activeTimers[id].timeout));
    this.activeTimers = {};
  }
}

const esp32Service = new ESP32Service();

process.on('SIGINT', async () => {
  await esp32Service.cleanup();
  process.exit();
});

module.exports = esp32Service;
