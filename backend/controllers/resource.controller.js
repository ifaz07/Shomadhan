const Resource = require('../models/Resource.model');
const Complaint = require('../models/Complaint.model');
const User = require('../models/User.model');

// ─────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Calculate complaint density in a geographic area
 * Returns density score based on nearby complaints and their urgency
 */
const calculateComplaintDensity = async (latitude, longitude, radiusKm = 5) => {
  try {
    const complaints = await Complaint.find({
      latitude: { $exists: true },
      longitude: { $exists: true },
      status: { $ne: 'resolved' },
    });

    let densityScore = 0;
    complaints.forEach(complaint => {
      // Haversine distance formula
      const R = 6371; // Earth's radius in km
      const dLat = (complaint.latitude - latitude) * (Math.PI / 180);
      const dLon = (complaint.longitude - longitude) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(latitude * (Math.PI / 180)) *
          Math.cos(complaint.latitude * (Math.PI / 180)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      if (distance <= radiusKm) {
        const urgencyWeight = {
          Critical: 5,
          High: 3,
          Medium: 2,
          Low: 1,
        };
        const weight = urgencyWeight[complaint.priority] || 1;
        densityScore += weight * (1 - distance / radiusKm); // Weight by proximity
      }
    });

    return Math.min(densityScore, 100);
  } catch (error) {
    console.error('Error calculating complaint density:', error);
    return 0;
  }
};

/**
 * Calculate optimal resources for deployment based on complaint analysis
 */
const calculateOptimalDeployment = async (complaint) => {
  try {
    const suggestions = [];

    // Get resources based on complaint category/department
    const categoryToDepartment = {
      'Public Works': ['dept_public_works'],
      Water: ['dept_water_authority'],
      Electricity: ['dept_electricity'],
      Sanitation: ['dept_sanitation'],
      Safety: ['dept_public_safety'],
      'Law Enforcement': ['dept_public_safety'],
    };

    const departments = categoryToDepartment[complaint.category] || [];

    if (departments.length > 0) {
      for (const dept of departments) {
        const resources = await Resource.find({
          department: dept,
          isOperational: true,
          status: 'active',
          availableQuantity: { $gt: 0 },
        }).sort('-priority');

        suggestions.push(...resources.slice(0, 3)); // Top 3 resources per department
      }
    }

    // Calculate density-based suggestions
    if (complaint.latitude && complaint.longitude) {
      const density = await calculateComplaintDensity(
        complaint.latitude,
        complaint.longitude
      );

      if (density > 50) {
        // High density area - suggest more resources
        const allResources = await Resource.find({
          isOperational: true,
          status: 'active',
          availableQuantity: { $gt: 0 },
        })
          .sort('-priority')
          .limit(10);

        suggestions.push(...allResources);
      }
    }

    // Remove duplicates
    const uniqueSuggestions = [...new Set(suggestions.map(r => r._id.toString()))].map(
      id => suggestions.find(r => r._id.toString() === id)
    );

    return uniqueSuggestions.slice(0, 5);
  } catch (error) {
    console.error('Error calculating optimal deployment:', error);
    return [];
  }
};

/**
 * Update resource availability after deployment/return
 */
const updateResourceAvailability = async (resourceId, quantity, action) => {
  const resource = await Resource.findById(resourceId);
  if (!resource) throw new Error('Resource not found');

  if (action === 'deploy') {
    if (resource.availableQuantity < quantity) {
      throw new Error(`Insufficient quantity. Available: ${resource.availableQuantity}`);
    }
    resource.availableQuantity -= quantity;
    resource.deployedQuantity += quantity;
  } else if (action === 'return') {
    if (resource.deployedQuantity < quantity) {
      throw new Error(`Cannot return more than deployed. Deployed: ${resource.deployedQuantity}`);
    }
    resource.availableQuantity += quantity;
    resource.deployedQuantity -= quantity;
  }

  await resource.save();
  return resource;
};

// ─────────────────────────────────────────────────────────────────────────
// CONTROLLER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Create a new resource
 * Public Servant: Can only create for their own department
 * Mayor: Can create for any department
 */
exports.createResource = async (req, res) => {
  try {
    const { name, type, category, description, department, totalQuantity, baseLocation } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;
    const userDept = req.user.department;

    // Authorization: Only mayor or department admin can create
    if (userRole !== 'mayor' && userRole !== 'admin') {
      return res.status(403).json({ message: 'Only mayor or admin can create resources' });
    }

    // Department check for non-mayor users
    if (userRole !== 'mayor' && department !== userDept) {
      return res.status(403).json({ message: 'Can only create resources for your department' });
    }

    const resource = new Resource({
      name,
      type,
      category,
      description,
      department,
      totalQuantity,
      availableQuantity: totalQuantity,
      baseLocation,
      managedBy: userId,
    });

    await resource.save();
    res.status(201).json({ success: true, data: resource });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get all resources with filtering options
 */
exports.getResources = async (req, res) => {
  try {
    const { department, type, category, status, isOperational } = req.query;
    const userRole = req.user.role;
    const userDept = req.user.department;

    const filter = {};

    if (department) filter.department = department;
    else if (userRole === 'department_officer') {
      // Public servants only see resources from their department
      filter.department = userDept;
    }

    if (type) filter.type = type;
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (isOperational !== undefined) filter.isOperational = isOperational === 'true';

    const resources = await Resource.find(filter)
      .populate('managedBy', 'name email')
      .sort('-priority -availableQuantity');

    res.status(200).json({ success: true, data: resources });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get single resource
 */
exports.getResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('managedBy', 'name email')
      .populate('deploymentHistory.deployedBy', 'name email');

    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    res.status(200).json({ success: true, data: resource });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Update resource
 * Public Servant: Can only update resources they manage in their department
 * Mayor: Can update any resource
 */
exports.updateResource = async (req, res) => {
  try {
    const resourceId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    // Authorization check
    if (
      userRole !== 'mayor' &&
      userRole !== 'admin' &&
      resource.managedBy.toString() !== userId.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this resource' });
    }

    const allowedFields = [
      'name',
      'description',
      'totalQuantity',
      'baseLocation',
      'currentLocation',
      'isOperational',
      'responseTime',
      'maxDeploymentDistance',
      'priority',
      'specializations',
      'estimatedCostPerDeployment',
      'maintenanceCostPerMonth',
      'notes',
      'status',
    ];

    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        resource[key] = req.body[key];
      }
    });

    // Sync available/deployed quantities
    if (req.body.totalQuantity) {
      const difference = req.body.totalQuantity - resource.totalQuantity;
      resource.availableQuantity += difference;
    }

    await resource.save();
    res.status(200).json({ success: true, data: resource });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Delete resource
 * Mayor only
 */
exports.deleteResource = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== 'mayor' && userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only mayor or admin can delete resources' });
    }

    const resource = await Resource.findByIdAndDelete(req.params.id);
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    res.status(200).json({ success: true, message: 'Resource deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Deploy a resource to a complaint
 * Public Servant: Can deploy department's resources
 * Mayor: Can deploy any resource
 */
exports.deployResource = async (req, res) => {
  try {
    const { resourceId, quantity, complaintId } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;
    const userDept = req.user.department;

    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    // Authorization: Public servants can only deploy their department's resources
    if (userRole === 'department_officer' && resource.department !== userDept) {
      return res.status(403).json({
        success: false,
        message: 'Can only deploy resources from your department',
      });
    }

    // Check availability
    if (resource.availableQuantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient quantity. Available: ${resource.availableQuantity}`,
      });
    }

    // Get complaint for location info
    const complaint = complaintId ? await Complaint.findById(complaintId) : null;

    // Update availability
    resource.availableQuantity -= quantity;
    resource.deployedQuantity += quantity;
    resource.totalDeployments += 1;
    resource.successfulDeployments += 1;

    // Add deployment history
    const deployment = {
      resourceId: resource._id,
      deployedBy: userId,
      deployedTo: complaintId,
      location: complaint ? {
        latitude: complaint.latitude,
        longitude: complaint.longitude,
        address: complaint.location,
      } : resource.currentLocation,
      status: 'deployed',
      deployedAt: new Date(),
    };

    resource.deploymentHistory.push(deployment);
    await resource.save();

    // Update complaint if provided
    if (complaint) {
      if (!complaint.allocatedResources) {
        complaint.allocatedResources = [];
      }
      complaint.allocatedResources.push({
        resourceId: resource._id,
        resourceName: resource.name,
        quantity,
        allocatedAt: new Date(),
        status: 'deployed',
      });
      await complaint.save();
    }

    res.status(200).json({
      success: true,
      message: 'Resource deployed successfully',
      data: resource,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Return a deployed resource
 */
exports.returnResource = async (req, res) => {
  try {
    const { resourceId, quantity, deploymentHistoryId } = req.body;
    const userId = req.user._id;

    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    // Check deployed quantity
    if (resource.deployedQuantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Cannot return more than deployed. Deployed: ${resource.deployedQuantity}`,
      });
    }

    // Update availability
    resource.availableQuantity += quantity;
    resource.deployedQuantity -= quantity;

    // Update deployment history
    if (deploymentHistoryId) {
      const deployment = resource.deploymentHistory.find(
        d => d._id.toString() === deploymentHistoryId
      );
      if (deployment) {
        deployment.status = 'returned';
        deployment.returnedAt = new Date();
        deployment.duration = Math.round(
          (deployment.returnedAt - deployment.deployedAt) / 60000
        ); // minutes
      }
    }

    await resource.save();

    res.status(200).json({
      success: true,
      message: 'Resource returned successfully',
      data: resource,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get optimal deployment suggestions for a complaint
 */
exports.getOptimalDeploymentSuggestions = async (req, res) => {
  try {
    const { complaintId } = req.query;

    if (!complaintId) {
      return res.status(400).json({
        success: false,
        message: 'Complaint ID is required',
      });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const suggestions = await calculateOptimalDeployment(complaint);

    res.status(200).json({
      success: true,
      data: suggestions,
      message: `Found ${suggestions.length} optimal resource(s) for deployment`,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get resource statistics and analytics
 */
exports.getResourceStats = async (req, res) => {
  try {
    const { department } = req.query;
    const userRole = req.user.role;
    const userDept = req.user.department;

    const filter = {};
    if (department) {
      filter.department = department;
    } else if (userRole === 'department_officer') {
      filter.department = userDept;
    }

    const resources = await Resource.find(filter);

    const stats = {
      totalResources: resources.length,
      totalAvailable: resources.reduce((sum, r) => sum + r.availableQuantity, 0),
      totalDeployed: resources.reduce((sum, r) => sum + r.deployedQuantity, 0),
      totalInMaintenance: resources.reduce((sum, r) => sum + r.maintenanceQuantity, 0),
      operationalCount: resources.filter(r => r.isOperational).length,
      utilizationRate: resources.length
        ? (
            (resources.reduce((sum, r) => sum + r.deployedQuantity, 0) /
              resources.reduce((sum, r) => sum + r.totalQuantity, 0)) *
            100
          ).toFixed(2)
        : 0,
      byType: {},
      byCategory: {},
      byStatus: {},
      totalDeployments: resources.reduce((sum, r) => sum + r.totalDeployments, 0),
      successfulDeployments: resources.reduce((sum, r) => sum + r.successfulDeployments, 0),
    };

    // Group by type, category, and status
    resources.forEach(resource => {
      stats.byType[resource.type] = (stats.byType[resource.type] || 0) + resource.totalQuantity;
      stats.byCategory[resource.category] =
        (stats.byCategory[resource.category] || 0) + resource.totalQuantity;
      stats.byStatus[resource.status] = (stats.byStatus[resource.status] || 0) + 1;
    });

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Schedule maintenance for a resource
 */
exports.scheduleMainenance = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { scheduledDate, type, description } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    // Authorization
    if (
      userRole !== 'mayor' &&
      userRole !== 'admin' &&
      resource.managedBy.toString() !== userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to schedule maintenance for this resource',
      });
    }

    const maintenance = {
      scheduledDate,
      type: type || 'preventive',
      description,
      status: 'pending',
    };

    resource.maintenanceSchedule.push(maintenance);
    if (!resource.nextMaintenanceDate || scheduledDate < resource.nextMaintenanceDate) {
      resource.nextMaintenanceDate = scheduledDate;
    }

    await resource.save();

    res.status(200).json({
      success: true,
      message: 'Maintenance scheduled successfully',
      data: resource,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get resources by geographic proximity to a location
 */
exports.getNearbyResources = async (req, res) => {
  try {
    const { latitude, longitude, radiusKm = 50, resourceType } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const filter = {
      isOperational: true,
      status: 'active',
      availableQuantity: { $gt: 0 },
      'currentLocation.latitude': { $exists: true },
      'currentLocation.longitude': { $exists: true },
    };

    if (resourceType) filter.type = resourceType;

    const resources = await Resource.find(filter);

    // Calculate distances
    const R = 6371; // Earth's radius in km
    const nearby = resources
      .map(resource => {
        const dLat = (resource.currentLocation.latitude - latitude) * (Math.PI / 180);
        const dLon = (resource.currentLocation.longitude - longitude) * (Math.PI / 180);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(latitude * (Math.PI / 180)) *
            Math.cos(resource.currentLocation.latitude * (Math.PI / 180)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return {
          ...resource.toObject(),
          distance: distance.toFixed(2),
        };
      })
      .filter(r => r.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    res.status(200).json({
      success: true,
      count: nearby.length,
      data: nearby,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
