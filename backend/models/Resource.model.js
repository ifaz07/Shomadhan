const mongoose = require('mongoose');
const { DEPARTMENT_KEYS } = require('../utils/departmentTaxonomy');

const RESOURCE_TYPES = [
  'Vehicle',
  'Equipment',
  'Officer',
  'Staff',
  'Machinery',
  'Medical Supply',
  'Communication Device',
];

const RESOURCE_CATEGORIES = [
  'Emergency Response',
  'Road & Infrastructure',
  'Sanitation',
  'Water Supply',
  'Medical',
  'Security',
  'Support',
];

const deploymentHistorySchema = new mongoose.Schema({
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource',
    required: true,
  },
  deployedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  deployedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
  },
  status: {
    type: String,
    enum: ['deployed', 'returned', 'in-transit', 'on-standby'],
    default: 'deployed',
  },
  deployedAt: {
    type: Date,
    default: Date.now,
  },
  returnedAt: {
    type: Date,
  },
  duration: Number, // minutes
  notes: String,
});

const maintenanceScheduleSchema = new mongoose.Schema({
  scheduledDate: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    enum: ['preventive', 'corrective', 'inspection'],
    default: 'preventive',
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending',
  },
  description: String,
  completedAt: Date,
  notes: String,
});

const resourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Resource name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: RESOURCE_TYPES,
      required: [true, 'Resource type is required'],
    },
    category: {
      type: String,
      enum: RESOURCE_CATEGORIES,
      required: [true, 'Resource category is required'],
    },
    description: {
      type: String,
      trim: true,
    },

    // ── Department Ownership ────────────────────────────────────────────
    department: {
      type: String,
      enum: DEPARTMENT_KEYS,
      required: [true, 'Department is required'],
    },
    managedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Manager user is required'],
    },

    // ── Availability Tracking ───────────────────────────────────────────
    totalQuantity: {
      type: Number,
      required: [true, 'Total quantity is required'],
      min: 1,
    },
    availableQuantity: {
      type: Number,
      required: true,
      default: function () {
        return this.totalQuantity;
      },
      min: 0,
    },
    deployedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    maintenanceQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── Location Tracking ───────────────────────────────────────────────
    currentLocation: {
      latitude: Number,
      longitude: Number,
      address: {
        type: String,
        trim: true,
      },
    },
    baseLocation: {
      latitude: Number,
      longitude: Number,
      address: {
        type: String,
        trim: true,
      },
    },

    // ── Operational Data ────────────────────────────────────────────────
    isOperational: {
      type: Boolean,
      default: true,
    },
    responseTime: {
      // in minutes
      type: Number,
      default: 15,
    },
    maxDeploymentDistance: {
      // in kilometers
      type: Number,
      default: 50,
    },

    // ── Deployment History & Maintenance ────────────────────────────────
    deploymentHistory: [deploymentHistorySchema],
    maintenanceSchedule: [maintenanceScheduleSchema],
    lastMaintenanceDate: Date,
    nextMaintenanceDate: Date,

    // ── Performance Metrics ─────────────────────────────────────────────
    totalDeployments: {
      type: Number,
      default: 0,
    },
    successfulDeployments: {
      type: Number,
      default: 0,
    },
    averageDeploymentTime: Number, // minutes
    utilizationRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // ── Priority & Specialization ───────────────────────────────────────
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    specializations: [String], // e.g., ['fire-response', 'hazmat', 'rescue']

    // ── Cost & Maintenance ──────────────────────────────────────────────
    estimatedCostPerDeployment: Number,
    maintenanceCostPerMonth: Number,
    notes: {
      type: String,
      trim: true,
    },

    // ── Status ──────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance', 'retired'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// Indexes for efficient querying
resourceSchema.index({ department: 1 });
resourceSchema.index({ type: 1 });
resourceSchema.index({ category: 1 });
resourceSchema.index({ status: 1 });
resourceSchema.index({ isOperational: 1 });
resourceSchema.index({ 'currentLocation.latitude': 1, 'currentLocation.longitude': 1 });

module.exports = mongoose.model('Resource', resourceSchema);
