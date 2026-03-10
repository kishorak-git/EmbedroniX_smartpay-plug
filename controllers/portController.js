const portService = require('../services/portService');

/**
 * Get status of all ports
 * GET /port-status
 */
const getPortStatus = (req, res) => {
  try {
    // Get status for all 3 ports
    const port1Status = portService.getPortStatus(1);
    const port2Status = portService.getPortStatus(2);
    const port3Status = portService.getPortStatus(3);

    // Format response
    const response = {
      success: true,
      ports: {
        port1: port1Status.active ? 'active' : 'inactive',
        port2: port2Status.active ? 'active' : 'inactive',
        port3: port3Status.active ? 'active' : 'inactive'
      },
      details: {
        port1: port1Status,
        port2: port2Status,
        port3: port3Status
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting port status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get port status',
      message: error.message
    });
  }
};

module.exports = {
  getPortStatus
};
