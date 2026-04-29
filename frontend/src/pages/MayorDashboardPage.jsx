import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  MapPin,
  Briefcase,
  FileText,
  RefreshCw,
  Download,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { dashboardAPI } from '../services/api';

const MayorDashboardPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    fetchDashboardMetrics();
  }, [dateRange]);

  const fetchDashboardMetrics = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getMetrics(dateRange);
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      toast.error(t('errorFetchingDashboard') || 'Failed to fetch dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }}>
            <RefreshCw size={40} className="text-blue-600" />
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  if (!dashboardData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <p className="text-gray-600">{t('noDataAvailable') || 'No data available'}</p>
        </div>
      </DashboardLayout>
    );
  }

  const { overall, complaints, departmentPerformance, caseProgress, volunteerStats, trends } = dashboardData;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('mayorDashboard') || 'Mayor Dashboard'}</h1>
            <p className="text-gray-600">{t('cityGovernanceMonitoring') || 'City Governance & Monitoring Panel'}</p>
          </div>

          <div className="flex gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>

            <button
              onClick={fetchDashboardMetrics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <RefreshCw size={18} /> Refresh
            </button>

            <button className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition flex items-center gap-2">
              <Download size={18} /> Export
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={FileText}
            label={t('totalComplaints') || 'Total Complaints'}
            value={overall.totalComplaints}
            trend="up"
            color="blue"
          />
          <KPICard
            icon={Clock}
            label={t('pendingIssues') || 'Pending Issues'}
            value={overall.pendingComplaints}
            trend="down"
            color="orange"
          />
          <KPICard
            icon={CheckCircle2}
            label={t('resolvedIssues') || 'Resolved Issues'}
            value={overall.resolvedComplaints}
            trend="up"
            color="green"
          />
          <KPICard
            icon={AlertCircle}
            label={t('criticalIssues') || 'Critical Issues'}
            value={overall.criticalComplaints}
            trend="down"
            color="red"
          />
        </div>

        {/* Performance Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title={t('resolutionRate') || 'Resolution Rate'}
            value={`${overall.resolutionRate}%`}
            icon={TrendingUp}
            color="green"
            description="Issues resolved this period"
          />
          <MetricCard
            title={t('slaCompliance') || 'SLA Compliance'}
            value={`${overall.slaCompliance}%`}
            icon={Briefcase}
            color="blue"
            description="Departmental SLA adherence"
          />
          <MetricCard
            title={t('policeCase') || 'Police Cases'}
            value={caseProgress.slaCompliance.totalCases}
            icon={AlertCircle}
            color="purple"
            description="Active investigations"
          />
        </div>

        {/* Department Performance */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={24} className="text-blue-600" />
            {t('departmentPerformance') || 'Department Performance'}
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Department</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Complaints</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Resolution</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">SLA Compliance</th>
                </tr>
              </thead>
              <tbody>
                {departmentPerformance.map((dept) => (
                  <tr key={dept.department} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900 capitalize">
                      {dept.department.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-700">
                      {dept.complaints.totalComplaints}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                        {dept.resolutionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          dept.slaCompliance >= 80
                            ? 'bg-green-100 text-green-700'
                            : dept.slaCompliance >= 60
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {dept.slaCompliance.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Complaint Status Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Status Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Status Distribution</h3>
            <div className="space-y-3">
              {complaints.byStatus.map((item) => (
                <StatusBar
                  key={item._id}
                  label={item._id}
                  count={item.count}
                  total={overall.totalComplaints}
                  color={getStatusColor(item._id)}
                />
              ))}
            </div>
          </div>

          {/* Priority Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Priority Levels</h3>
            <div className="space-y-3">
              {complaints.byPriority.map((item) => (
                <PriorityBar
                  key={item._id}
                  priority={item._id}
                  total={item.count}
                  resolved={item.resolvedCount}
                  pending={item.pendingCount}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Case Progress */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Briefcase size={20} className="text-purple-600" />
            Police Case Progress
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {caseProgress.byStatus.map((item) => (
              <div key={item._id} className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <p className="text-sm text-gray-600 mb-2 capitalize">{item._id.replace(/_/g, ' ')}</p>
                <p className="text-3xl font-bold text-purple-700">{item.count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Volunteers & Announcements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users size={20} className="text-blue-600" />
              Volunteer Statistics
            </h3>
            <div className="space-y-3">
              <Stat label="Verified Volunteers" value={volunteerStats.byStatus.find(s => s._id === 'verified')?.count || 0} />
              <Stat
                label="Pending Applications"
                value={volunteerStats.byStatus.find(s => s._id === 'pending')?.count || 0}
              />
              <Stat label="Active Announcements" value={overall.activeAnnouncements} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-red-600" />
              Hotspot Analysis
            </h3>
            <p className="text-sm text-gray-600 mb-4">Top complaint areas requiring attention</p>
            {trends.topIssuesByEngagement.slice(0, 5).map((issue, idx) => (
              <div key={issue._id} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
                <span className="text-xs font-bold text-white bg-red-500 rounded-full w-5 h-5 flex items-center justify-center">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{issue.title}</p>
                  <p className="text-xs text-gray-500">{issue.category}</p>
                </div>
                <span className="text-xs font-semibold text-blue-600">{issue.voteCount} votes</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

// ─── Helper Components ──────────────────────────────────────────────

const KPICard = ({ icon: Icon, label, value, trend, color }) => {
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 text-blue-600',
    orange: 'from-orange-50 to-orange-100 text-orange-600',
    green: 'from-green-50 to-green-100 text-green-600',
    red: 'from-red-50 to-red-100 text-red-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition"
    >
      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center mb-4`}>
        <Icon size={24} />
      </div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
    </motion.div>
  );
};

const MetricCard = ({ title, value, icon: Icon, color, description }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-2">{title}</p>
          <p className="text-4xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 mt-2">{description}</p>
        </div>
        <Icon size={28} className={`text-${color}-600`} />
      </div>
    </motion.div>
  );
};

const StatusBar = ({ label, count, total, color }) => {
  const percentage = (count / total) * 100;
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 capitalize">{label}</span>
        <span className="text-sm font-semibold text-gray-900">{count}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full bg-${color}-500 transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const PriorityBar = ({ priority, total, resolved, pending }) => {
  const priorityColors = {
    Critical: 'red',
    High: 'orange',
    Medium: 'yellow',
    Low: 'green',
  };

  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{priority}</span>
        <span className="text-sm font-semibold text-gray-900">{total}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div className="flex h-full">
          <div
            className={`bg-green-500 transition-all`}
            style={{ width: `${(resolved / total) * 100}%` }}
          />
          <div className={`bg-${priorityColors[priority]}-500 transition-all`} style={{ width: `${(pending / total) * 100}%` }} />
        </div>
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>Resolved: {resolved}</span>
        <span>Pending: {pending}</span>
      </div>
    </div>
  );
};

const Stat = ({ label, value }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
    <span className="text-sm text-gray-700">{label}</span>
    <span className="text-lg font-bold text-gray-900">{value}</span>
  </div>
);

const getStatusColor = (status) => {
  const colors = {
    pending: 'bg-yellow-500',
    'in-progress': 'bg-blue-500',
    resolved: 'bg-green-500',
    rejected: 'bg-red-500',
  };
  return colors[status] || 'bg-gray-500';
};

export default MayorDashboardPage;
