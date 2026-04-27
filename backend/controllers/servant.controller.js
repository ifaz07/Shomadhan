const Complaint = require("../models/Complaint.model");
const { sendNotification } = require("../services/notificationService");

const DEPT_CATEGORY_MAP = {
  public_works: ["Road"],
  water_authority: ["Water"],
  electricity: ["Electricity"],
  sanitation: ["Waste"],
  public_safety: ["Safety"],
  animal_control: ["Environment"],
  environment: ["Environment"],
  health: ["Other"],
  transport: ["Road"],
  police: ["Law Enforcement"],
  other: [
    "Road",
    "Waste",
    "Electricity",
    "Water",
    "Safety",
    "Environment",
    "Law Enforcement",
    "Other",
  ],
};

// Maps priority and status to a numeric value for "always on top" sorting
const PRIORITY_SORT_STAGE = {
  $addFields: {
    _sortWeight: {
      $switch: {
        branches: [
          // Critical + Pending gets the absolute highest weight (always on top)
          { 
            case: { 
              $and: [
                { $eq: ["$priority", "Critical"] },
                { $eq: ["$status", "pending"] }
              ] 
            }, 
            then: 100 
          },
          // Other Critical cases
          { case: { $eq: ["$priority", "Critical"] }, then: 90 },
          // Regular priority levels
          { case: { $eq: ["$priority", "High"] }, then: 3 },
          { case: { $eq: ["$priority", "Medium"] }, then: 2 },
          { case: { $eq: ["$priority", "Low"] }, then: 1 },
        ],
        default: 0,
      },
    },
  },
};

// @desc    Get complaints assigned to this officer's department
// @route   GET /api/v1/servant/complaints
// @access  Private (department_officer only)
const getDepartmentComplaints = async (req, res, next) => {
  try {
    const categories = DEPT_CATEGORY_MAP[req.user.department] || [];

    const { status, priority, location, page = 1, limit = 20 } = req.query;

    const matchStage = { category: { $in: categories } };
    if (status && status !== "all") matchStage.status = status;
    if (priority && priority !== "all") matchStage.priority = priority;
    if (location && String(location).trim()) {
      matchStage.location = {
        $regex: String(location).trim(),
        $options: "i",
      };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const pageLimit = Number(limit);

    const [results, totalArr] = await Promise.all([
      Complaint.aggregate([
        { $match: matchStage },
        PRIORITY_SORT_STAGE,
        { $sort: { _sortWeight: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: pageLimit },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
            pipeline: [{ $project: { name: 1, email: 1 } }],
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      ]),
      Complaint.countDocuments(matchStage),
    ]);

    res.status(200).json({
      success: true,
      count: results.length,
      total: totalArr,
      page: Number(page),
      pages: Math.ceil(totalArr / pageLimit),
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single complaint for the officer's department with reporter details
// @route   GET /api/v1/servant/complaints/:id
// @access  Private (department_officer only)
const getDepartmentComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate({
      path: "user",
      select: "name email phone avatar presentAddress isVerified",
    });

    if (!complaint) {
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    }

    const categories = DEPT_CATEGORY_MAP[req.user.department] || [];
    if (!categories.includes(complaint.category)) {
      return res.status(403).json({
        success: false,
        message: "This complaint does not belong to your department.",
      });
    }

    res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign or update SLA for a department complaint
// @route   PUT /api/v1/servant/complaints/:id/sla
// @access  Private (department_officer only)
const setComplaintSLA = async (req, res, next) => {
  try {
    const { hours } = req.body;
    const slaHours = Number(hours);

    if (!slaHours || slaHours <= 0 || slaHours > 168) {
      return res.status(400).json({
        success: false,
        message: "SLA hours must be between 1 and 168",
      });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    }

    const categories = DEPT_CATEGORY_MAP[req.user.department] || [];
    if (!categories.includes(complaint.category)) {
      return res.status(403).json({
        success: false,
        message: "This complaint does not belong to your department.",
      });
    }

    if (complaint.status === "resolved" || complaint.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: `Cannot update SLA for a '${complaint.status}' complaint.`,
      });
    }

    if (complaint.slaDeadline && new Date(complaint.slaDeadline).getTime() > Date.now()) {
      return res.status(400).json({
        success: false,
        message: "The deadline is already active and cannot be updated until the current time window is over.",
      });
    }

    complaint.slaDurationHours = slaHours;
    complaint.slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);
    complaint.slaAssignedBy = req.user._id;

    complaint.history = complaint.history || [];
    complaint.history.push({
      status: complaint.status,
      message: `SLA updated to ${slaHours}h by ${req.user.name}`,
      updatedAt: new Date(),
    });

    await complaint.save();

    res.status(200).json({ success: true, data: complaint });
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

    const [total, pending, inProgress, resolved, rejected, critical, high] =
      await Promise.all([
        Complaint.countDocuments({ category: { $in: categories } }),
        Complaint.countDocuments({
          category: { $in: categories },
          status: "pending",
        }),
        Complaint.countDocuments({
          category: { $in: categories },
          status: "in-progress",
        }),
        Complaint.countDocuments({
          category: { $in: categories },
          status: "resolved",
        }),
        Complaint.countDocuments({
          category: { $in: categories },
          status: "rejected",
        }),
        Complaint.countDocuments({
          category: { $in: categories },
          priority: "Critical",
        }),
        Complaint.countDocuments({
          category: { $in: categories },
          priority: "High",
        }),
      ]);

    // Recent 5 critical/high complaints (sorted Critical first, then High)
    const urgent = await Complaint.aggregate([
      {
        $match: {
          category: { $in: categories },
          priority: { $in: ["Critical", "High"] },
          status: { $in: ["pending", "in-progress"] },
        },
      },
      PRIORITY_SORT_STAGE,
      { $sort: { _priorityOrder: -1, createdAt: -1 } },
      { $limit: 5 },
      {
        $project: {
          ticketId: 1,
          title: 1,
          category: 1,
          priority: 1,
          status: 1,
          location: 1,
          createdAt: 1,
          voteCount: 1,
          slaDeadline: 1,
        },
      },
    ]);

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

    const allowed = ["in-progress", "resolved", "rejected"];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${allowed.join(", ")}`,
      });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    }

    // Ensure this officer's department covers this complaint's category
    const categories = DEPT_CATEGORY_MAP[req.user.department] || [];
    if (!categories.includes(complaint.category)) {
      return res.status(403).json({
        success: false,
        message: "This complaint does not belong to your department.",
      });
    }

    // Prevent nonsensical status changes (e.g. re-opening a resolved complaint)
    if (complaint.status === "resolved" || complaint.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: `Cannot change status of a '${complaint.status}' complaint.`,
      });
    }

    const deptName = req.user.department.replace(/_/g, " ");
    const historyEntry = {
      status,
      message: `Status changed to '${status}' by ${deptName} officer (${req.user.name}).${note ? ` Note: ${note}` : ""}`,
      updatedAt: new Date(),
    };

    complaint.status = status;
    complaint.history = complaint.history || [];
    complaint.history.push(historyEntry);
    await complaint.save();

    // Trigger Notification
    if (complaint.user) {
      await sendNotification(complaint.user, {
        subject: `Complaint Status Updated: ${status.toUpperCase()}`,
        message: `Your complaint "${complaint.title}" (Ticket: ${complaint.ticketId}) has been updated to "${status}".${note ? ` Note: ${note}` : ""}`,
        type: status === "resolved" ? "success" : "info",
        relatedTicket: complaint._id,
      });
    }

    res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDepartmentComplaints,
  getDepartmentComplaintById,
  getDepartmentStats,
  updateComplaintStatus,
  setComplaintSLA,
};
