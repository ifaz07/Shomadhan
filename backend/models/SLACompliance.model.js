const mongoose = require('mongoose');

const slaComplianceSchema = new mongoose.Schema(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      unique: true, // One SLA record per complaint
    },
    department: {
      type: String,
      enum: [
        'public_works',
        'water_authority',
        'electricity',
        'sanitation',
        'public_safety',
        'animal_control',
        'health',
        'transport',
        'environment',
        'other',
      ],
      required: true,
    },
    
    // SLA Targets (in hours)
    acknowledgmentSLA: {
      target: { type: Number, default: 24 }, // 24 hours
      actual: Number,
      status: { type: String, enum: ['met', 'breached', 'pending'], default: 'pending' },
    },
    assignmentSLA: {
      target: { type: Number, default: 48 }, // 48 hours
      actual: Number,
      status: { type: String, enum: ['met', 'breached', 'pending'], default: 'pending' },
    },
    resolutionSLA: {
      target: { type: Number, default: 168 }, // 7 days (168 hours)
      actual: Number,
      status: { type: String, enum: ['met', 'breached', 'pending'], default: 'pending' },
    },
    
    // Performance Tracking
    createdAt: {
      type: Date,
      default: Date.now,
    },
    acknowledgedAt: Date,
    assignedAt: Date,
    resolvedAt: Date,
    
    // Overall SLA Status
    overallSLAStatus: {
      type: String,
      enum: ['compliant', 'at_risk', 'breached'],
      default: 'compliant',
    },
    breachReason: String,
    
    // Escalation Info
    escalated: {
      type: Boolean,
      default: false,
    },
    escalationLevel: {
      type: Number,
      default: 0, // 1 = manager, 2 = director, 3 = commissioner
    },
    escalatedAt: Date,
    escalatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // Priority Adjustments
    priorityAtCreation: String,
    priorityAdjustments: [
      {
        from: String,
        to: String,
        reason: String,
        adjustedAt: Date,
        adjustedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    
    // Extensions (if SLA needs to be extended)
    extensionRequested: {
      type: Boolean,
      default: false,
    },
    extensionReason: String,
    extensionApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    newTargetDate: Date,
    
    // Metrics for Analytics
    turnaroundTime: Number, // Total time from creation to resolution in hours
    departmentPerformanceScore: Number, // 0-100
    
    // Notes
    notes: String,
  },
  { timestamps: true }
);

// Index for performance analytics
slaComplianceSchema.index({ department: 1, overallSLAStatus: 1 });
slaComplianceSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SLACompliance', slaComplianceSchema);
