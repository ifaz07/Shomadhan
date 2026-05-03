const mongoose = require('mongoose');

const departmentMetricSchema = new mongoose.Schema({
  departmentKey: {
    type: String,
    required: true,
    unique: true
  },
  departmentName: String,
  totalComplaints: { type: Number, default: 0 },
  overdueComplaints: { type: Number, default: 0 },
  escalations: { type: Number, default: 0 },
  lowRatings: { type: Number, default: 0 }, // 1-2 stars
  reassignments: { type: Number, default: 0 },
  ignoredComplaints: { type: Number, default: 0 }, // No update for > 7 days
  
  // Normalized Scores (0-100)
  scores: {
    delay: { type: Number, default: 0 },
    escalation: { type: Number, default: 0 },
    feedback: { type: Number, default: 0 },
    reassignment: { type: Number, default: 0 },
    ignored: { type: Number, default: 0 }
  },
  
  riskScore: { type: Number, default: 0 },
  riskLevel: {
    type: String,
    enum: ['Low', 'Moderate', 'High'],
    default: 'Low'
  },
  
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('DepartmentMetric', departmentMetricSchema);
