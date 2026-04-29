const {
  getSLAMetrics,
  getComplaintStats,
  getDepartmentPerformance,
  getCaseProgress,
  getHeatmapAnalysis,
  getVolunteerStats,
  getOverallMetrics,
  getIssuesTrend,
  getTopIssuesByEngagement,
} = require('../services/dashboardService');

// @desc    Get overall dashboard metrics (mayor/authority dashboard)
// @route   GET /api/v1/dashboard/metrics
// @access  Private (Mayor/Admin only)
const getDashboardMetrics = async (req, res, next) => {
  try {
    const { dateRange = 30 } = req.query;

    const [
      overallMetrics,
      complaintStats,
      departmentPerformance,
      caseProgress,
      volunteerStats,
      issuesTrend,
      topIssues,
    ] = await Promise.all([
      getOverallMetrics(parseInt(dateRange)),
      getComplaintStats(parseInt(dateRange)),
      getDepartmentPerformance(parseInt(dateRange)),
      getCaseProgress(parseInt(dateRange)),
      getVolunteerStats(),
      getIssuesTrend(parseInt(dateRange)),
      getTopIssuesByEngagement(10, parseInt(dateRange)),
    ]);

    res.status(200).json({
      success: true,
      data: {
        overall: overallMetrics,
        complaints: complaintStats,
        departmentPerformance,
        caseProgress,
        volunteerStats,
        trends: {
          issuesTrend,
          topIssuesByEngagement: topIssues,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get SLA compliance metrics
// @route   GET /api/v1/dashboard/sla-metrics
// @access  Private (Mayor/Admin/Department Officer)
const getSLAComplianceMetrics = async (req, res, next) => {
  try {
    const { department, dateRange = 30 } = req.query;

    const metrics = await getSLAMetrics(
      department || null,
      parseInt(dateRange)
    );

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get department performance analysis
// @route   GET /api/v1/dashboard/department-performance
// @access  Private (Mayor/Admin)
const getDepartmentPerformanceMetrics = async (req, res, next) => {
  try {
    const { dateRange = 30 } = req.query;

    const performance = await getDepartmentPerformance(parseInt(dateRange));

    res.status(200).json({
      success: true,
      data: performance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get police case progress data
// @route   GET /api/v1/dashboard/case-progress
// @access  Private (Mayor/Admin/Public Safety Officer)
const getCaseProgressData = async (req, res, next) => {
  try {
    const { dateRange = 30 } = req.query;

    const caseData = await getCaseProgress(parseInt(dateRange));

    res.status(200).json({
      success: true,
      data: caseData,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get heatmap analysis data
// @route   GET /api/v1/dashboard/heatmap-analysis
// @access  Private (Mayor/Admin)
const getHeatmapAnalysisData = async (req, res, next) => {
  try {
    const { dateRange = 30 } = req.query;

    const heatmapData = await getHeatmapAnalysis(parseInt(dateRange));

    res.status(200).json({
      success: true,
      data: heatmapData,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get issues trend data (pending vs resolved)
// @route   GET /api/v1/dashboard/issues-trend
// @access  Private (Mayor/Admin)
const getIssuesTrendData = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;

    const trend = await getIssuesTrend(parseInt(days));

    res.status(200).json({
      success: true,
      data: trend,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get top issues by community engagement
// @route   GET /api/v1/dashboard/top-issues
// @access  Private (Mayor/Admin)
const getTopIssuesData = async (req, res, next) => {
  try {
    const { limit = 10, dateRange = 30 } = req.query;

    const topIssues = await getTopIssuesByEngagement(
      parseInt(limit),
      parseInt(dateRange)
    );

    res.status(200).json({
      success: true,
      data: topIssues,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardMetrics,
  getSLAComplianceMetrics,
  getDepartmentPerformanceMetrics,
  getCaseProgressData,
  getHeatmapAnalysisData,
  getIssuesTrendData,
  getTopIssuesData,
};
