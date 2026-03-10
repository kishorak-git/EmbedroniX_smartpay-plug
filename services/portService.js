// Port activation service (simulated GPIO control)

// Track active ports
const activePorts = new Map();

/**
 * Activate a power output port for specified duration
 * @param {number} port - Port number (1, 2, or 3)
 * @param {number} duration - Duration in seconds
 * @returns {Object} Activation result
 */
const activatePort = (port, duration) => {
  return new Promise((resolve, reject) => {
    // Check if port is already active
    if (activePorts.has(port)) {
      return reject({
        error: 'Port already active',
        message: `Port ${port} is currently in use`
      });
    }

    // Mark port as active
    activePorts.set(port, {
      startTime: new Date(),
      duration: duration,
      active: true
    });

    console.log(`✅ Port ${port} ACTIVATED for ${duration} seconds`);

    // Schedule automatic deactivation
    setTimeout(() => {
      deactivatePort(port);
    }, duration * 1000);

    resolve({
      success: true,
      message: 'Power Activated',
      port: port,
      duration: duration,
      startTime: new Date()
    });
  });
};

/**
 * Deactivate a power output port
 * @param {number} port - Port number
 */
const deactivatePort = (port) => {
  if (activePorts.has(port)) {
    activePorts.delete(port);
    console.log(`🔴 Port ${port} DEACTIVATED`);
    return true;
  }
  return false;
};

/**
 * Get status of a specific port
 * @param {number} port - Port number
 * @returns {Object} Port status
 */
const getPortStatus = (port) => {
  if (activePorts.has(port)) {
    const portInfo = activePorts.get(port);
    const elapsed = Math.floor((new Date() - portInfo.startTime) / 1000);
    const remaining = Math.max(0, portInfo.duration - elapsed);
    
    return {
      port: port,
      active: true,
      startTime: portInfo.startTime,
      duration: portInfo.duration,
      elapsed: elapsed,
      remaining: remaining
    };
  }
  
  return {
    port: port,
    active: false
  };
};

/**
 * Get all active ports
 * @returns {Array} List of active ports
 */
const getAllActivePorts = () => {
  const ports = [];
  activePorts.forEach((info, port) => {
    ports.push(getPortStatus(port));
  });
  return ports;
};

module.exports = {
  activatePort,
  deactivatePort,
  getPortStatus,
  getAllActivePorts
};
