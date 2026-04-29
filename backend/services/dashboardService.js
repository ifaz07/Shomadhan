const Complaint = require('../models/Complaint.model');
const SLACompliance = require('../models/SLACompliance.model');
const CaseProgress = require('../models/CaseProgress.model');
const Volunteer = require('../models/Volunteer.model');
const CivicAnnouncement = require('../models/CivicAnnouncement.model');
const User = require('../models/User.model');

/**
 * Dashboard Analytics Service
 * Provides aggregated metrics for the Mayor/City Corporation Dashboard
 */

// ─── SLA Compliance Metrics ───────────────────────────────────────────────
const getSLAMetrics = async (department = null, dateRange = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);

    const query = { createdAt: { $gte: startDate } };
    if (department) query.department = department;

    const metrics = await SLACompliance.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$department',
          totalComplaints: { $sum: 1 },
          compliantCount: {
            $sum: { $cond: [{ $eq: ['$overallSLAStatus', 'compliant'] }, 1, 0] },
          },
          atRiskCount: {
            $sum: { $cond: [{ $eq: ['$overallSLAStatus', 'at_risk'] }, 1, 0] },
          },
          breachedCount: {
            $sum: { $cond: [{ $eq: ['$overallSLAStatus', 'breached'] }, 1, 0] },
          },
          averageTurnaroundHours: { $avg: '$turnaroundTime' },
          averagePerformanceScore: { $avg: '$departmentPerformanceScore' },
        },
      },
      {
        $addFields: {
          complianceRate: {
            $multiply: [
              { $divide: ['$compliantCount', '$totalComplaints'] },
              100,
            ],
          },
        },
      },
    ]);

    return metrics;
  } catch (error) {
    console.error('[DashboardService] Error in getSLAMetrics:', error);
    throw error;
  }
};

// ─── Complaint Statistics ────────────────────────────────────────────────
const getComplaintStats = async (dateRange = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);

    const [statusStats, categoryStats, priorityStats] = await Promise.all([
      Complaint.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgPriority: { $avg: 1 },
          },
        },
      ]),

      Complaint.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgVotes: { $avg: '$voteCount' },
          },
        },
      ]),

      Complaint.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 },
            pendingCount: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
            },
            resolvedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    return {
      byStatus: statusStats,
      byCategory: categoryStats,
      byPriority: priorityStats,
    };
  } catch (error) {
    console.error('[DashboardService] Error in getComplaintStats:', error);
    throw error;
  }
};

// ─── Department Performance ──────────────────────────────────────────────
const getDepartmentPerformance = async (dateRange = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);

    const departments = [
      'public_works',
      'water_authority',
      'electricity',
      'sanitation',
      'public_safety',
      'animal_control',
    ];

    const performance = await Promise.all(
      departments.map(async (dept) => {
        const stats = await Complaint.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate },
              'nlpAnalysis.suggestedDepartment': dept,
            },
          },
          {
            $group: {
              _id: null,
              totalComplaints: { $sum: 1 },
              resolvedCount: {
                $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
              },
              criticalCount: {
                $sum: { $cond: [{ $eq: ['$priority', 'Critical'] }, 1, 0] },
              },
              avgVotes: { $avg: '$voteCount' },
            },
          },
        ]);

        const slaMetrics = await SLACompliance.aggregate([
          {
            $match: {
              department: dept,
              createdAt: { $gte: startDate },
            },
          },
          {
            $group: {
              _id: null,
              complianceRate: {
                $avg: {
                  $cond: [
                    { $eq: ['$overallSLAStatus', 'compliant'] },
                    100,
                    0,
                  ],
                },
              },
            },
          },
        ]);

        return {
          department: dept,
          complaints: stats[0] || {
            totalComplaints: 0,
            resolvedCount: 0,
            criticalCount: 0,
            avgVotes: 0,
          },
          slaCompliance: slaMetrics[0]?.complianceRate || 0,
          resolutionRate: stats[0]
            ? (stats[0].resolvedCount / stats[0].totalComplaints) * 100
            : 0,
        };
      })
    );

    return performance;
  } catch (error) {
    console.error('[DashboardService] Error in getDepartmentPerformance:', error);
    throw error;
  }
};

// ─── Police Case Progress ────────────────────────────────────────────────
const getCaseProgress = async (dateRange = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);

    const caseStats = await CaseProgress.aggregate([
      { $match: { registeredAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$investigationStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    const severityStats = await CaseProgress.aggregate([
      { $match: { registeredAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 },
          avgElapsedDays: { $avg: '$investigationDaysElapsed' },
        },
      },
    ]);

    const slaCompliance = await CaseProgress.aggregate([
      { $match: { registeredAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalCases: { $sum: 1 },
          slaCompliantCount: {
            $sum: { $cond: ['$slaCompliant', 1, 0] },
          },
          slaBreachedCount: {
            $sum: { $cond: [{ $eq: ['$slaCompliant', false] }, 1, 0] },
          },
        },
      },
    ]);

    return {
      byStatus: caseStats,
      bySeverity: severityStats,
      slaCompliance: slaCompliance[0] || {
        totalCases: 0,
        slaCompliantCount: 0,
        slaBreachedCount: 0,
      },
    };
  } catch (error) {
    console.error('[DashboardService] Error in getCaseProgress:', error);
    throw error;
  }
};

// ─── Heatmap Analysis ───────────────────────────────────────────────────
const getHeatmapAnalysis = async (dateRange = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);

    const heatmapData = await Complaint.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          latitude: { $exists: true, $ne: null },
          longitude: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: {
            location: '$location',
            latitude: '$latitude',
            longitude: '$longitude',
            category: '$category',
          },
          count: { $sum: 1 },
          criticalCount: {
            $sum: { $cond: [{ $eq: ['$priority', 'Critical'] }, 1, 0] },
          },
          avgVotes: { $avg: '$voteCount' },
          resolvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 100 }, // Top 100 hotspots
    ]);

    return heatmapData;
  } catch (error) {
    console.error('[DashboardService] Error in getHeatmapAnalysis:', error);
    throw error;
  }
};

// ─── Volunteer Statistics ────────────────────────────────────────────────
const getVolunteerStats = async () => {
  try {
    const stats = await Volunteer.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalHours: { $sum: '$hoursContributed' },
          totalActivities: { $sum: '$completedActivities' },
          averageRating: { $avg: '$rating' },
        },
      },
    ]);

    const skills = await Volunteer.aggregate([
      { $match: { status: 'verified' } },
      { $unwind: '$skills' },
      {
        $group: {
          _id: '$skills',
          count: { $sum: 1 },
        },
      },
    ]);

    const announcements = await CivicAnnouncement.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
        },
      },
    ]);

    return {
      byStatus: stats,
      bySkills: skills,
      announcements,
    };
  } catch (error) {
    console.error('[DashboardService] Error in getVolunteerStats:', error);
    throw error;
  }
};

// ─── Overall Dashboard Metrics ──────────────────────────────────────────
const getOverallMetrics = async (dateRange = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);

    const [
      totalComplaints,
      pendingComplaints,
      resolvedComplaints,
      criticalComplaints,
      totalCases,
      slaData,
      volunteerData,
      announcementData,
    ] = await Promise.all([
      Complaint.countDocuments({ createdAt: { $gte: startDate } }),
      Complaint.countDocuments({
        status: 'pending',
        createdAt: { $gte: startDate },
      }),
      Complaint.countDocuments({
        status: 'resolved',
        createdAt: { $gte: startDate },
      }),
      Complaint.countDocuments({
        priority: 'Critical',
        createdAt: { $gte: startDate },
      }),
      CaseProgress.countDocuments({ registeredAt: { $gte: startDate } }),
      SLACompliance.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            compliant: {
              $sum: {
                $cond: [{ $eq: ['$overallSLAStatus', 'compliant'] }, 1, 0],
              },
            },
            breached: {
              $sum: {
                $cond: [{ $eq: ['$overallSLAStatus', 'breached'] }, 1, 0],
              },
            },
            total: { $sum: 1 },
          },
        },
      ]),
      Volunteer.countDocuments({ status: 'verified' }),
      CivicAnnouncement.countDocuments({ status: 'published' }),
    ]);

    const resolutionRate =
      totalComplaints > 0 ? (resolvedComplaints / totalComplaints) * 100 : 0;
    const slaCompliance = slaData[0]
      ? (slaData[0].compliant / slaData[0].total) * 100
      : 0;

    return {
      totalComplaints,
      pendingComplaints,
      resolvedComplaints,
      criticalComplaints,
      resolutionRate: parseFloat(resolutionRate.toFixed(2)),
      totalCases,
      slaCompliance: parseFloat(slaCompliance.toFixed(2)),
      verifiedVolunteers: volunteerData,
      activeAnnouncements: announcementData,
      dateRange,
    };
  } catch (error) {
    console.error('[DashboardService] Error in getOverallMetrics:', error);
    throw error;
  }
};

// ─── Pending vs Resolved Issues Trend ────────────────────────────────────
const getIssuesTrend = async (days = 30) => {
  try {
    const trend = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const pending = await Complaint.countDocuments({
        createdAt: { $gte: date, $lt: nextDate },
        status: 'pending',
      });

      const resolved = await Complaint.countDocuments({
        status: 'resolved',
        updatedAt: { $gte: date, $lt: nextDate },
      });

      trend.push({
        date: date.toISOString().split('T')[0],
        pending,
        resolved,
      });
    }
    return trend;
  } catch (error) {
    console.error('[DashboardService] Error in getIssuesTrend:', error);
    throw error;
  }
};

// ─── Top Issues by Community Engagement ──────────────────────────────────
const getTopIssuesByEngagement = async (limit = 10, dateRange = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);

    const topIssues = await Complaint.find({
      createdAt: { $gte: startDate },
    })
      .sort({ voteCount: -1 })
      .limit(limit)
      .populate('user', 'name email')
      .select('title category priority status voteCount latitude longitude');

    return topIssues;
  } catch (error) {
    console.error('[DashboardService] Error in getTopIssuesByEngagement:', error);
    throw error;
  }
};

module.exports = {
  getSLAMetrics,
  getComplaintStats,
  getDepartmentPerformance,
  getCaseProgress,
  getHeatmapAnalysis,
  getVolunteerStats,
  getOverallMetrics,
  getIssuesTrend,
  getTopIssuesByEngagement,
};
