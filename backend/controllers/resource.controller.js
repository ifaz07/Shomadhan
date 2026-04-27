const Resource = require('../models/Resource.model');
const Complaint = require('../models/Complaint.model');

// @desc    Create a new resource
// @route   POST /api/v1/resources
// @access  Private (admin, servant)
const createResource = async (req, res) => {
  try {
    const { name, type, category, status, currentLocation, capacity, department, contact, capabilities, availability, notes } = req.body;

    const resource = await Resource.create({
      name,
      type,
      category,
      status: status || 'available',
      currentLocation,
      capacity,
      department,
      contact,
      capabilities,
      availability,
      notes,
    });

    res.status(201).json({
      success: true,
      data: resource,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all resources
// @route   GET /api/v1/resources
// @access  Private
const getResources = async (req, res) => {
  try {
    const { status, type, category, department, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (category) query.category = category;
    if (department) query.department = department;

    const resources = await Resource.find(query)
      .populate('assignedTo.complaint', 'title status priority')
      .populate('assignedTo.assignedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Resource.countDocuments(query);

    res.status(200).json({
      success: true,
      data: resources,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single resource
// @route   GET /api/v1/resources/:id
// @access  Private
const getResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('assignedTo.complaint', 'title status priority location')
      .populate('assignedTo.assignedBy', 'name email');

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    res.status(200).json({
      success: true,
      data: resource,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update resource
// @route   PUT /api/v1/resources/:id
// @access  Private (admin, servant)
const updateResource = async (req, res) => {
  try {
    const { name, type, category, status, currentLocation, capacity, department, contact, capabilities, availability, notes, lastMaintenance, nextMaintenance } = req.body;

    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    // Update fields
    if (name) resource.name = name;
    if (type) resource.type = type;
    if (category) resource.category = category;
    if (status) resource.status = status;
    if (currentLocation) resource.currentLocation = currentLocation;
    if (capacity) resource.capacity = capacity;
    if (department) resource.department = department;
    if (contact) resource.contact = contact;
    if (capabilities) resource.capabilities = capabilities;
    if (availability) resource.availability = availability;
    if (notes) resource.notes = notes;
    if (lastMaintenance) resource.lastMaintenance = lastMaintenance;
    if (nextMaintenance) resource.nextMaintenance = nextMaintenance;

    await resource.save();

    res.status(200).json({
      success: true,
      data: resource,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete resource
// @route   DELETE /api/v1/resources/:id
// @access  Private (admin, servant)
const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    if (resource.status === 'deployed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a deployed resource. Release it first.',
      });
    }

    await resource.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Resource deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Deploy resource to a complaint
// @route   POST /api/v1/resources/:id/deploy
// @access  Private (admin, servant)
const deployResource = async (req, res) => {
  try {
    const { complaintId } = req.body;

    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    if (resource.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Resource is not available for deployment',
      });
    }

    // Verify complaint exists
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    resource.status = 'deployed';
    resource.assignedTo = {
      complaint: complaintId,
      assignedAt: new Date(),
      assignedBy: req.user._id,
    };

    await resource.save();

    res.status(200).json({
      success: true,
      message: 'Resource deployed successfully',
      data: resource,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Release resource from deployment
// @route   POST /api/v1/resources/:id/release
// @access  Private (admin, servant)
const releaseResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    if (resource.status !== 'deployed') {
      return res.status(400).json({
        success: false,
        message: 'Resource is not currently deployed',
      });
    }

    resource.status = 'available';
    resource.assignedTo = {
      complaint: null,
      assignedAt: null,
      assignedBy: null,
    };

    await resource.save();

    res.status(200).json({
      success: true,
      message: 'Resource released successfully',
      data: resource,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get available resources
// @route   GET /api/v1/resources/available
// @access  Public
const getAvailableResources = async (req, res) => {
  try {
    const { type, category, department, lat, lng, radius = 10 } = req.query;
    
    const query = { status: 'available' };
    if (type) query.type = type;
    if (category) query.category = category;
    if (department) query.department = department;

    let resources = await Resource.find(query)
      .populate('assignedTo.complaint', 'title')
      .sort({ type: 1 });

    // If location provided, filter by distance
    if (lat && lng) {
      resources = resources.filter(resource => {
        if (!resource.currentLocation?.coordinates) return false;
        const [rLng, rLat] = resource.currentLocation.coordinates;
        const distance = calculateDistance(parseFloat(lat), parseFloat(lng), rLat, rLng);
        return distance <= parseFloat(radius);
      });
    }

    res.status(200).json({
      success: true,
      data: resources,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get resource suggestions for optimal deployment
// @route   GET /api/v1/resources/suggestions
// @access  Private (admin, servant)
const getResourceSuggestions = async (req, res) => {
  try {
    const { lat, lng, urgency, category, count = 3 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    // Get available resources
    const availableResources = await Resource.find({ status: 'available' })
      .populate('assignedTo.complaint', 'title priority');

    // Calculate distance and score for each resource
    const scoredResources = availableResources.map(resource => {
      let distance = Infinity;
      let score = 100;

      if (resource.currentLocation?.coordinates) {
        const [rLng, rLat] = resource.currentLocation.coordinates;
        distance = calculateDistance(parseFloat(lat), parseFloat(lng), rLat, rLng);
        
        // Base score - closer resources get higher score
        score = Math.max(0, 100 - (distance * 2)); // -2 points per km
        
        // Urgency adjustment
        if (urgency === 'critical') score += 20;
        else if (urgency === 'high') score += 10;
        
        // Category match bonus
        if (category && resource.category === category) {
          score += 15;
        }
      }

      return {
        resource,
        distance: distance.toFixed(2),
        score: Math.round(score),
      };
    });

    // Sort by score and return top suggestions
    const suggestions = scoredResources
      .sort((a, b) => b.score - a.score)
      .slice(0, parseInt(count));

    res.status(200).json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get resource statistics
// @route   GET /api/v1/resources/stats
// @access  Public
const getResourceStats = async (req, res) => {
  try {
    const stats = await Resource.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const typeStats = await Resource.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]);

    const departmentStats = await Resource.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        byStatus: stats,
        byType: typeStats,
        byDepartment: departmentStats,
        total: stats.reduce((acc, s) => acc + s.count, 0),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Helper function to calculate distance (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg) => deg * (Math.PI / 180);

module.exports = {
  createResource,
  getResources,
  getResource,
  updateResource,
  deleteResource,
  deployResource,
  releaseResource,
  getAvailableResources,
  getResourceSuggestions,
  getResourceStats,
};