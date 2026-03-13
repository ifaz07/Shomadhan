const Complaint = require('../models/Complaint.model');

// ─── Department → Complaint category mapping ──────────────────────────
const DEPT_CATEGORY_MAP = {
  public_works:    ['Road'],
  water_authority: ['Water'],
  electricity:     ['Electricity'],
  sanitation:      ['Waste'],
  public_safety:   ['Safety'],
  animal_control:  ['Environment'],
  environment:     ['Environment'],
  health:          ['Other'],
  transport:       ['Road'],
  other:           ['Road', 'Waste', 'Electricity', 'Water', 'Safety', 'Environment', 'Other'],
};

// @desc    Get complaints assigned to this officer's department
// @route   GET /api/v1/servant/complaints
// @access  Private (department_officer only)
const getDepartmentComplaints = async (req, res, next) => {
  try {
    const categories = DEPT_CATEGORY_MAP[req.user.department] || [];

    const { status, priority, page = 1, limit = 20 } = req.query;

    const query = { category: { $in: categories } };
    if (status && status !== 'all') query.status = status;
    if (priority && priority !== 'all') query.priority = priority;

    const skip = (Number(page) - 1) * Number(limit);

    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('user', 'name email'),
      Complaint.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: complaints.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: complaints,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get summary stats for the officer's department
// @route   GET /api/v1/servant/stats
// @access  Private (department_officer only)
const getDepartmentStats = async (req, res, next) => {
  try {
    const categories = DEPT_CATEGORY_MAP[req.user.department] || [];

    const [total, pending, inProgress, resolved, rejected, critical, high] = await Promise.all([
      Complaint.countDocuments({ category: { $in: categories } }),
      Complaint.countDocuments({ category: { $in: categories }, status: 'pending' }),
      Complaint.countDocuments({ category: { $in: categories }, status: 'in-progress' }),
      Complaint.countDocuments({ category: { $in: categories }, status: 'resolved' }),
      Complaint.countDocuments({ category: { $in: categories }, status: 'rejected' }),
      Complaint.countDocuments({ category: { $in: categories }, priority: 'Critical' }),
      Complaint.countDocuments({ category: { $in: categories }, priority: 'High' }),
    ]);

    // Recent 5 critical/high complaints
    const urgent = await Complaint.find({
      category: { $in: categories },
      priority: { $in: ['Critical', 'High'] },
      status: { $in: ['pending', 'in-progress'] },
    })
      .sort({ priority: -1, createdAt: -1 })
      .limit(5)
      .select('ticketId title category priority status location createdAt voteCount');

    res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        inProgress,
        resolved,
        rejected,
        critical,
        high,
        urgent,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update complaint status (servant action)
// @route   PUT /api/v1/servant/complaints/:id/status
// @access  Private (department_officer only)
const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;

    const allowed = ['in-progress', 'resolved', 'rejected'];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${allowed.join(', ')}`,
      });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Ensure this officer's department covers this complaint's category
    const categories = DEPT_CATEGORY_MAP[req.user.department] || [];
    if (!categories.includes(complaint.category)) {
      return res.status(403).json({
        success: false,
        message: 'This complaint does not belong to your department.',
      });
    }

    // Prevent nonsensical status changes (e.g. re-opening a resolved complaint)
    if (complaint.status === 'resolved' || complaint.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: `Cannot change status of a '${complaint.status}' complaint.`,
      });
    }

    const deptName = req.user.department.replace(/_/g, ' ');
    const historyEntry = {
      message: `Status changed to '${status}' by ${deptName} officer (${req.user.name}).${note ? ` Note: ${note}` : ''}`,
      timestamp: new Date(),
    };

    complaint.status = status;
    complaint.history = complaint.history || [];
    complaint.history.push(historyEntry);
    await complaint.save();

    res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDepartmentComplaints, getDepartmentStats, updateComplaintStatus };
