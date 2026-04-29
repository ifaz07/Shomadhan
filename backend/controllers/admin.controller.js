const User = require('../models/User.model');

/**
 * @desc    Get users filtered by role
 * @route   GET /api/v1/admin/users?role=citizen
 * @access  Private/Admin
 */
exports.getUsersByRole = async (req, res, next) => {
  try {
    const { role } = req.query;
    const query = role ? { role } : {};
    
    const users = await User.find(query).select('-password').sort('-createdAt');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all pending Mayor approval requests
 * @route   GET /api/v1/admin/pending-mayors
 * @access  Private/Admin
 */
exports.getPendingMayors = async (req, res, next) => {
  try {
    const pendingMayors = await User.find({
      role: 'mayor',
      'verificationDoc.status': 'pending'
    }).select('-password');

    res.status(200).json({
      success: true,
      count: pendingMayors.length,
      data: pendingMayors
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all pending Public Servant approval requests
 * @route   GET /api/v1/admin/pending-servants
 * @access  Private/Admin
 */
exports.getPendingServants = async (req, res, next) => {
  try {
    const pendingServants = await User.find({
      role: 'department_officer',
      'verificationDoc.status': 'pending'
    }).select('-password');

    res.status(200).json({
      success: true,
      count: pendingServants.length,
      data: pendingServants
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all pending Citizen verification requests
 * @route   GET /api/v1/admin/pending-verifications
 * @access  Private/Admin
 */
exports.getPendingVerifications = async (req, res, next) => {
  try {
    const pending = await User.find({
      'verificationDoc.status': 'pending',
      role: 'citizen'
    }).select('-password');

    res.status(200).json({
      success: true,
      count: pending.length,
      data: pending
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve or Reject a Mayor request
 * @route   PUT /api/v1/admin/approve-mayor/:id
 * @access  Private/Admin
 */
exports.approveMayor = async (req, res, next) => {
  try {
    const { status } = req.body; 
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (status === 'approved') {
      user.isActive = true;
      user.isVerified = true;
      user.verificationDoc.status = 'approved';
      user.verificationDoc.verifiedAt = new Date();
    } else {
      user.verificationDoc.status = 'rejected';
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${status} successfully`,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve or Reject a Public Servant request
 * @route   PUT /api/v1/admin/approve-servant/:id
 * @access  Private/Admin
 */
exports.approveServant = async (req, res, next) => {
  try {
    const { status } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (status === 'approved') {
      user.isActive = true;
      user.isVerified = true;
      user.verificationDoc.status = 'approved';
      user.verificationDoc.verifiedAt = new Date();
      user.verificationDoc.rejectionReason = undefined;
    } else {
      user.isActive = false;
      user.isVerified = false;
      user.verificationDoc.status = 'rejected';
      user.verificationDoc.verifiedAt = undefined;
      user.verificationDoc.rejectionReason = 'Public servant credentials could not be verified.';
    }

    user.markModified('verificationDoc');
    await user.save();

    res.status(200).json({
      success: true,
      message: `Public servant ${status} successfully`,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve or Reject a Citizen verification
 * @route   PUT /api/v1/admin/approve-verification/:id
 * @access  Private/Admin
 */
exports.approveVerification = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either approved or rejected',
      });
    }

    if (status === 'approved') {
      user.isVerified = true;
      user.verificationDoc.status = 'approved';
      user.verificationDoc.verifiedAt = new Date();
      user.verificationDoc.rejectionReason = undefined;
    } else {
      user.isVerified = false;
      user.verificationDoc.status = 'rejected';
      user.verificationDoc.verifiedAt = undefined;
      user.verificationDoc.rejectionReason = rejectionReason || 'Document could not be verified.';
    }

    user.markModified('verificationDoc');
    await user.save();

    res.status(200).json({
      success: true,
      message: `Verification ${status} successfully`,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove (Delete) a user
 * @route   DELETE /api/v1/admin/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent deleting self
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own admin account' });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User removed successfully'
    });
  } catch (error) {
    next(error);
  }
};
