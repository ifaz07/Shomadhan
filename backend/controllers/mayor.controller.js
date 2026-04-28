const Complaint = require('../models/Complaint.model');

/**
 * @desc    Get dashboard analytics for the Mayor
 * @route   GET /api/v1/mayor/dashboard-stats
 * @access  Private/Mayor
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    // 1. Global Complaint Counts
    const globalStats = await Complaint.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
          critical: {
            $sum: { $cond: [{ $eq: ['$priority', 'Critical'] }, 1, 0] },
          },
        },
      },
    ]);

    // 2. Department-wise performance
    const deptPerformance = await Complaint.aggregate([
      {
        $group: {
          _id: '$category',
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
          pendingInProgress: {
            $sum: {
              $cond: [
                { $in: ['$status', ['pending', 'in-progress']] },
                1,
                0,
              ],
            },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // 3. SLA Compliance (Exceeded deadline)
    const slaExceeded = await Complaint.countDocuments({
      status: { $ne: 'resolved' },
      slaDeadline: { $lt: new Date() },
    });

    res.status(200).json({
      success: true,
      data: {
        global: globalStats[0] || { total: 0, pending: 0, inProgress: 0, resolved: 0, critical: 0 },
        departments: deptPerformance,
        slaCompliance: {
          exceeded: slaExceeded,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
