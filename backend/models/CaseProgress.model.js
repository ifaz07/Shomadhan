const mongoose = require('mongoose');

const caseProgressSchema = new mongoose.Schema(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      unique: true, // One case per complaint
    },
    caseNumber: {
      type: String,
      unique: true,
      required: true,
    },
    
    // Investigation Details
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    investigationStatus: {
      type: String,
      enum: [
        'registered',
        'under_investigation',
        'evidence_collecting',
        'suspect_identified',
        'arrest_warranted',
        'trial_ongoing',
        'closed_solved',
        'closed_unsolved',
        'transferred',
      ],
      default: 'registered',
    },
    
    // Case Details
    caseType: {
      type: String,
      enum: [
        'theft',
        'vandalism',
        'assault',
        'public_nuisance',
        'traffic_violation',
        'environmental_crime',
        'other',
      ],
    },
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'serious', 'critical'],
      default: 'moderate',
    },
    
    // Investigation Progress
    evidenceCollected: [
      {
        description: String,
        type: String,
        url: String,
        collectedAt: Date,
        collectedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    witnesses: [
      {
        name: String,
        contact: String,
        statement: String,
        recordedAt: Date,
      },
    ],
    suspects: [
      {
        name: String,
        description: String,
        status: String, // identified, arrested, released, absconding
        arrestWarrant: Boolean,
        arrestDate: Date,
      },
    ],
    
    // Timeline
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    investigationStartDate: Date,
    expectedClosureDate: Date,
    actualClosureDate: Date,
    
    // Progress Updates
    updates: [
      {
        status: String,
        message: String,
        updatedAt: {
          type: Date,
          default: Date.now,
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    
    // Court Information
    courtCase: {
      caseNumber: String,
      courtName: String,
      filedDate: Date,
      nextHearing: Date,
      status: String, // pending, ongoing, concluded
    },
    
    // Performance Metrics
    investigationDaysElapsed: Number,
    slaCompliant: Boolean,
    
    // Investigation Notes
    investigationNotes: String,
    confidentialNotes: String,
    recommendations: String,
  },
  { timestamps: true }
);

// Index for queries
caseProgressSchema.index({ assignedOfficer: 1, investigationStatus: 1 });

module.exports = mongoose.model('CaseProgress', caseProgressSchema);
