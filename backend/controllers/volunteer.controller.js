const Volunteer = require('../models/Volunteer.model');
const User = require('../models/User.model');
const CivicAnnouncement = require('../models/CivicAnnouncement.model');

// @desc    Register as a volunteer
// @route   POST /api/v1/volunteers/register
// @access  Private (Citizen)
const registerVolunteer = async (req, res, next) => {
  try {
    const {
      fullName,
      phone,
      address,
      district,
      skills = [],
      availability = 'part_time',
      bio,
      agreedToTerms,
    } = req.body;

    // Check if already registered
    const existingVolunteer = await Volunteer.findOne({ user: req.user._id });
    if (existingVolunteer) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered as a volunteer',
      });
    }

    if (!fullName || !phone || !agreedToTerms) {
      return res.status(400).json({
        success: false,
        message: 'Full name, phone, and agreement to terms are required',
      });
    }

    const volunteer = new Volunteer({
      user: req.user._id,
      fullName,
      email: req.user.email,
      phone,
      address,
      district,
      skills,
      availability,
      bio,
      agreedToTerms,
      status: 'pending', // Needs verification
    });

    await volunteer.save();

    res.status(201).json({
      success: true,
      message: 'Volunteer registration submitted. Pending verification.',
      data: volunteer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get volunteer profile
// @route   GET /api/v1/volunteers/profile
// @access  Private
const getVolunteerProfile = async (req, res, next) => {
  try {
    const volunteer = await Volunteer.findOne({ user: req.user._id }).populate(
      'user',
      'name email phone'
    );

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer profile not found',
      });
    }

    res.status(200).json({
      success: true,
      data: volunteer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update volunteer profile
// @route   PUT /api/v1/volunteers/profile
// @access  Private (Own profile only)
const updateVolunteerProfile = async (req, res, next) => {
  try {
    const { skills, availability, bio, address, district, phone } = req.body;

    const volunteer = await Volunteer.findOneAndUpdate(
      { user: req.user._id },
      {
        skills: skills || undefined,
        availability: availability || undefined,
        bio: bio || undefined,
        address: address || undefined,
        district: district || undefined,
        phone: phone || undefined,
      },
      { new: true, runValidators: true }
    );

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer profile not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: volunteer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register for a volunteer announcement
// @route   POST /api/v1/volunteers/announcements/:announcementId/register
// @access  Private (Verified Volunteer only)
const registerForAnnouncement = async (req, res, next) => {
  try {
    const { announcementId } = req.params;

    const volunteer = await Volunteer.findOne({
      user: req.user._id,
      status: 'verified',
    });

    if (!volunteer) {
      return res.status(403).json({
        success: false,
        message: 'Only verified volunteers can register for announcements',
      });
    }

    const announcement = await CivicAnnouncement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
      });
    }

    // Check if already registered
    if (announcement.registeredVolunteers.includes(volunteer._id)) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this announcement',
      });
    }

    // Check if spots are available
    if (
      announcement.volunteersNeeded > 0 &&
      announcement.registeredVolunteers.length >= announcement.volunteersNeeded
    ) {
      return res.status(400).json({
        success: false,
        message: 'No more volunteer spots available',
      });
    }

    // Register volunteer
    announcement.registeredVolunteers.push(volunteer._id);
    volunteer.activeAnnouncements.push(announcementId);

    await Promise.all([announcement.save(), volunteer.save()]);

    res.status(200).json({
      success: true,
      message: 'Registered for announcement successfully',
      data: {
        announcement,
        volunteer,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unregister from a volunteer announcement
// @route   DELETE /api/v1/volunteers/announcements/:announcementId/register
// @access  Private
const unregisterFromAnnouncement = async (req, res, next) => {
  try {
    const { announcementId } = req.params;

    const volunteer = await Volunteer.findOne({ user: req.user._id });
    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer profile not found',
      });
    }

    const announcement = await CivicAnnouncement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
      });
    }

    // Remove volunteer from announcement
    announcement.registeredVolunteers = announcement.registeredVolunteers.filter(
      (v) => v.toString() !== volunteer._id.toString()
    );

    // Remove announcement from volunteer
    volunteer.activeAnnouncements = volunteer.activeAnnouncements.filter(
      (a) => a.toString() !== announcementId
    );

    await Promise.all([announcement.save(), volunteer.save()]);

    res.status(200).json({
      success: true,
      message: 'Unregistered from announcement successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all verified volunteers (admin/authority view)
// @route   GET /api/v1/volunteers
// @access  Private (Admin/Authority only)
const getAllVolunteers = async (req, res, next) => {
  try {
    const { status = 'verified', skill, district, limit = 50, page = 1 } =
      req.query;

    const query = {};
    if (status) query.status = status;
    if (skill) query.skills = skill;
    if (district) query.district = district;

    const skip = (page - 1) * limit;

    const volunteers = await Volunteer.find(query)
      .populate('user', 'name email phone')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Volunteer.countDocuments(query);

    res.status(200).json({
      success: true,
      data: volunteers,
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

// @desc    Verify volunteer (admin action)
// @route   PUT /api/v1/volunteers/:volunteerId/verify
// @access  Private (Admin only)
const verifyVolunteer = async (req, res, next) => {
  try {
    const { volunteerId } = req.params;
    const { status } = req.body; // 'verified' or 'rejected'

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be verified or rejected',
      });
    }

    const volunteer = await Volunteer.findByIdAndUpdate(
      volunteerId,
      {
        status,
        verifiedBy: req.user._id,
        verificationDate: new Date(),
      },
      { new: true }
    );

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer not found',
      });
    }

    res.status(200).json({
      success: true,
      message: `Volunteer ${status} successfully`,
      data: volunteer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get volunteer applications (pending verification)
// @route   GET /api/v1/volunteers/pending/applications
// @access  Private (Admin only)
const getPendingVolunteerApplications = async (req, res, next) => {
  try {
    const { limit = 50, page = 1 } = req.query;

    const skip = (page - 1) * limit;

    const volunteers = await Volunteer.find({ status: 'pending' })
      .populate('user', 'name email phone')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: 1 });

    const total = await Volunteer.countDocuments({ status: 'pending' });

    res.status(200).json({
      success: true,
      data: volunteers,
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

// @desc    Rate a volunteer (after activity completion)
// @route   PUT /api/v1/volunteers/:volunteerId/rate
// @access  Private (Admin/Authority only)
const rateVolunteer = async (req, res, next) => {
  try {
    const { volunteerId } = req.params;
    const { rating, hoursContributed } = req.body;

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    const volunteer = await Volunteer.findById(volunteerId);
    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer not found',
      });
    }

    // Update rating using weighted average
    const totalRatings = volunteer.totalRatings + 1;
    volunteer.rating =
      (volunteer.rating * volunteer.totalRatings + rating) / totalRatings;
    volunteer.totalRatings = totalRatings;
    volunteer.completedActivities += 1;

    if (hoursContributed) {
      volunteer.hoursContributed += hoursContributed;
    }

    await volunteer.save();

    res.status(200).json({
      success: true,
      message: 'Volunteer rated successfully',
      data: volunteer,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerVolunteer,
  getVolunteerProfile,
  updateVolunteerProfile,
  registerForAnnouncement,
  unregisterFromAnnouncement,
  getAllVolunteers,
  verifyVolunteer,
  getPendingVolunteerApplications,
  rateVolunteer,
};
