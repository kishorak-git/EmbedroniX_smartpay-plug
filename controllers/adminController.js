const db = require('../db');
const portService = require('../services/portService');

/**
 * Get all transactions
 * GET /transactions
 */
const getAllTransactions = async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        amount,
        output_port,
        duration_seconds,
        payment_status,
        phone_number,
        start_time,
        end_time,
        created_at
      FROM transactions
      ORDER BY created_at DESC
    `;

    const result = await db.query(query);

    res.json({
      success: true,
      count: result.rows.length,
      transactions: result.rows
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
      message: error.message
    });
  }
};

/**
 * Get admin dashboard summary
 * GET /admin-summary
 */
const getAdminSummary = async (req, res) => {
  try {
    // Get total transactions count
    const totalQuery = 'SELECT COUNT(*) as total FROM transactions';
    const totalResult = await db.query(totalQuery);
    const total_transactions = parseInt(totalResult.rows[0].total);

    // Get total revenue (only successful payments)
    const revenueQuery = `
      SELECT COALESCE(SUM(amount), 0) as revenue 
      FROM transactions 
      WHERE payment_status = 'SUCCESS'
    `;
    const revenueResult = await db.query(revenueQuery);
    const total_revenue = parseInt(revenueResult.rows[0].revenue);

    // Get completed transactions count
    const completedQuery = `
      SELECT COUNT(*) as completed 
      FROM transactions 
      WHERE payment_status = 'SUCCESS'
    `;
    const completedResult = await db.query(completedQuery);
    const completed_transactions = parseInt(completedResult.rows[0].completed);

    // Get pending transactions count
    const pendingQuery = `
      SELECT COUNT(*) as pending 
      FROM transactions 
      WHERE payment_status = 'PENDING'
    `;
    const pendingResult = await db.query(pendingQuery);
    const pending_transactions = parseInt(pendingResult.rows[0].pending);

    // Get active ports
    const activePorts = portService.getAllActivePorts();
    const active_ports = activePorts.length;

    // Return summary
    res.json({
      success: true,
      summary: {
        total_transactions,
        total_revenue,
        active_ports,
        completed_transactions,
        pending_transactions
      },
      active_ports_details: activePorts
    });

  } catch (error) {
    console.error('Error fetching admin summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin summary',
      message: error.message
    });
  }
};

/**
 * Manually reset/deactivate a port
 * POST /admin/reset-port
 */
const resetPort = async (req, res) => {
  try {
    const { port } = req.body;

    // Validate port number
    if (!port || ![1, 2, 3].includes(port)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid port number. Must be 1, 2, or 3'
      });
    }

    // Check if port is active
    const portStatus = portService.getPortStatus(port);
    
    if (!portStatus.active) {
      return res.status(400).json({
        success: false,
        error: `Port ${port} is not active`,
        message: 'Port is already inactive'
      });
    }

    // Deactivate the port
    const deactivated = portService.deactivatePort(port);

    if (deactivated) {
      res.json({
        success: true,
        message: `Port ${port} has been manually deactivated`,
        port: port,
        previous_status: portStatus
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to deactivate port'
      });
    }

  } catch (error) {
    console.error('Error resetting port:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset port',
      message: error.message
    });
  }
};

module.exports = {
  getAllTransactions,
  getAdminSummary,
  resetPort
};
