const CivicAnnouncement = require('../models/CivicAnnouncement.model');
const Volunteer = require('../models/Volunteer.model');

// @desc    Create a civic announcement
// @route   POST /api/v1/announcements
// @access  Private (Mayor/Authority only)
const createAnnouncement = async (req, res, next) => {
  try {
    const {
      title,
      description,
      content,
      category,
      imageUrl,
      videoUrl,
      volunteersNeeded = 0,
      requiredSkills = [],
      eventLocation,
      eventDate,
      eventEndDate,
      eventTime,
      targetDistricts = [],
      tags = [],
      priority = 'medium',
    } = req.body;

    if (!title || !description || !content || !category) {
      return res.status(400).json({
        success: false,
        message:
          'Title, description, content, and category are required',
      });
    }

    const announcement = new CivicAnnouncement({
      title,
      description,
      content,
      category,
      createdBy: req.user._id,
      department: req.user.department || 'general',
      imageUrl,
      videoUrl,
      volunteersNeeded: parseInt(volunteersNeeded),
      requiredSkills,
      eventLocation,
      eventDate: eventDate ? new Date(eventDate) : undefined,
      eventEndDate: eventEndDate ? new Date(eventEndDate) : undefined,
      eventTime,
      targetDistricts,
      tags,
      priority,
      status: 'draft', // Start as draft
    });

    await announcement.save();

    res.status(201).json({
      success: true,
      message: 'Announcement created as draft',
      data: announcement,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Publish an announcement
// @route   PUT /api/v1/announcements/:announcementId/publish
// @access  Private (Creator/Admin only)
const publishAnnouncement = async (req, res, next) => {
  try {
    const { announcementId } = req.params;

    const announcement = await CivicAnnouncement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
      });
    }

    // Check authorization
    if (
      announcement.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to publish this announcement',
      });
    }

    announcement.status = 'published';
    announcement.publishedAt = new Date();

    await announcement.save();

    res.status(200).json({
      success: true,
      message: 'Announcement published successfully',
      data: announcement,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all public announcements
// @route   GET /api/v1/announcements
// @access  Public
const getAnnouncements = async (req, res, next) => {
  try {
    const {
      category,
      status = 'published',
      district,
      search,
      limit = 20,
      page = 1,
    } = req.query;

    const query = { status };

    if (category) query.category = category;
    if (district) query.targetDistricts = district;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const announcements = await CivicAnnouncement.find(query)
      .populate('createdBy', 'name email department')
      .populate('registeredVolunteers', 'fullName skills')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ publishedAt: -1 });

    const total = await CivicAnnouncement.countDocuments(query);

    res.status(200).json({
      success: true,
      data: announcements,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single announcement
// @route   GET /api/v1/announcements/:announcementId
// @access  Public
const getAnnouncement = async (req, res, next) => {
  try {
    const { announcementId } = req.params;

    const announcement = await CivicAnnouncement.findByIdAndUpdate(
      announcementId,
      { $inc: { viewCount: 1 } },
      { new: true }
    )
      .populate('createdBy', 'name email department')
      .populate('registeredVolunteers', 'fullName skills rating');

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
      });
    }

    res.status(200).json({
      success: true,
      data: announcement,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update announcement
// @route   PUT /api/v1/announcements/:announcementId
// @access  Private (Creator/Admin only)
const updateAnnouncement = async (req, res, next) => {
  try {
    const { announcementId } = req.params;
    const updates = req.body;

    const announcement = await CivicAnnouncement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
      });
    }

    // Check authorization
    if (
      announcement.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this announcement',
      });
    }

    // Prevent updating status directly (use publish endpoint)
    delete updates.status;
    delete updates.publishedAt;

    Object.assign(announcement, updates);
    await announcement.save();

    res.status(200).json({
      success: true,
      message: 'Announcement updated successfully',
      data: announcement,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Archive announcement
// @route   DELETE /api/v1/announcements/:announcementId
// @access  Private (Creator/Admin only)
const archiveAnnouncement = async (req, res, next) => {
  try {
    const { announcementId } = req.params;

    const announcement = await CivicAnnouncement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
      });
    }

    // Check authorization
    if (
      announcement.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to archive this announcement',
      });
    }

    announcement.status = 'archived';
    await announcement.save();

    res.status(200).json({
      success: true,
      message: 'Announcement archived successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get announcements by creator (authority)
// @route   GET /api/v1/announcements/my-announcements
// @access  Private (Mayor/Authority)
const getMyAnnouncements = async (req, res, next) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;

    const query = { createdBy: req.user._id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const announcements = await CivicAnnouncement.find(query)
      .populate('registeredVolunteers', 'fullName skills rating')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await CivicAnnouncement.countDocuments(query);

    res.status(200).json({
      success: true,
      data: announcements,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add announcement update/progress message
// @route   POST /api/v1/announcements/:announcementId/updates
// @access  Private (Creator/Admin only)
const addAnnouncementUpdate = async (req, res, next) => {
  try {
    const { announcementId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Update message is required',
      });
    }

    const announcement = await CivicAnnouncement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
      });
    }

    // Check authorization
    if (
      announcement.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this announcement',
      });
    }

    announcement.updates.push({
      message,
      updatedAt: new Date(),
      updatedBy: req.user._id,
    });

    await announcement.save();

    res.status(200).json({
      success: true,
      message: 'Update added successfully',
      data: announcement,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Pin an announcement (make it featured)
// @route   PUT /api/v1/announcements/:announcementId/pin
// @access  Private (Admin only)
const pinAnnouncement = async (req, res, next) => {
  try {
    const { announcementId } = req.params;

    const announcement = await CivicAnnouncement.findByIdAndUpdate(
      announcementId,
      { status: 'pinned' },
      { new: true }
    );

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Announcement pinned successfully',
      data: announcement,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAnnouncement,
  publishAnnouncement,
  getAnnouncements,
  getAnnouncement,
  updateAnnouncement,
  archiveAnnouncement,
  getMyAnnouncements,
  addAnnouncementUpdate,
  pinAnnouncement,
};
