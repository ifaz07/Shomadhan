const VolunteerAd = require('../models/VolunteerAd.model');

/**
 * @desc    Create a new volunteer advertisement
 * @route   POST /api/v1/volunteer-ads
 * @access  Private/Mayor
 */
exports.createVolunteerAd = async (req, res, next) => {
  try {
    const { title, description, dateOfEvent, requiredVolunteers, contactDetails } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a poster image' });
    }

    const posterUrl = `/uploads/volunteer/${req.file.filename}`;

    const ad = await VolunteerAd.create({
      title,
      description,
      posterUrl,
      dateOfEvent,
      requiredVolunteers,
      contactDetails,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: ad,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all active volunteer ads
 * @route   GET /api/v1/volunteer-ads/active
 * @access  Public
 */
exports.getActiveVolunteerAds = async (req, res, next) => {
  try {
    const ads = await VolunteerAd.find({ isActive: true })
      .sort({ dateOfEvent: 1 })
      .populate('createdBy', 'name');

    res.status(200).json({
      success: true,
      count: ads.length,
      data: ads,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Register a user for a volunteer ad
 * @route   POST /api/v1/volunteer-ads/:id/register
 * @access  Private/Citizen
 */
exports.registerForVolunteer = async (req, res, next) => {
  try {
    const ad = await VolunteerAd.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }

    if (!ad.isActive) {
      return res.status(400).json({ success: false, message: 'This advertisement is no longer active' });
    }

    // Check if already registered
    if (ad.registeredVolunteers.includes(req.user.id)) {
      return res.status(400).json({ success: false, message: 'You are already registered for this event' });
    }

    // Check if full
    if (ad.registeredVolunteers.length >= ad.requiredVolunteers) {
      return res.status(400).json({ success: false, message: 'This event is already full' });
    }

    ad.registeredVolunteers.push(req.user.id);
    await ad.save();

    res.status(200).json({
      success: true,
      message: 'Successfully registered as a volunteer',
      data: ad,
    });
  } catch (error) {
    next(error);
  }
};
