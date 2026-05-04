const User = require('../models/User.model');
const Notification = require('../models/Notification.model');
const { sendEmail } = require('./emailService');

// Helper: Haversine distance in km
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Send email and/or push notification to a user and save to DB
 */
const sendNotification = async (userId, options) => {
  try {
    if (!userId) return;

    // ─── 0. Save to Database ─────────────────────────────────────
    const dbNotification = await Notification.create({
      recipient: userId,
      title: options.subject,
      message: options.message,
      type: options.type || 'info',
      relatedTicket: options.relatedTicket,
    });

    const user = await User.findById(userId);
    if (!user) return;

    // ─── 1. Send Email ───────────────────────────────────────────
    if (user.email && process.env.RESEND_API_KEY) {
      try {
        await sendEmail({
          to: user.email,
          subject: options.subject || 'Shomadhan Update',
          fromName: "Shomadhan",
          text: options.message,
          html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #0d9488;">Shomadhan Updates</h2>
            <p style="font-size: 16px;">Hello ${user.name},</p>
            <p style="line-height: 1.6;">${options.message}</p>
            <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
              <p>This is an automated message from the Shomadhan Platform. Please do not reply to this email.</p>
            </div>
          </div>
        `,
        });
      } catch (mailError) {
        console.error('Resend Error:', mailError.message);
      }
    }

    // ─── 2. Send Push Notification (FCM) ─────────────────────────
    if (user.fcmToken) {
        console.log(`[FCM] Would send push to ${user.fcmToken}: ${options.message}`);
    }

  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

/**
 * Broadcast an emergency alert to all users within 5km radius of the incident.
 */
const sendEmergencyAlertToNearbyUsers = async (complaint) => {
  try {
    const { latitude, longitude, title, ticketId, _id } = complaint;
    if (!latitude || !longitude) return;

    // Find all users who have set their present address
    const users = await User.find({
        'presentAddress.lat': { $ne: null },
        'presentAddress.lng': { $ne: null },
    });

    const RADIUS_KM = 5;
    const nearbyUsers = users.filter(user => {
        const dist = haversineKm(latitude, longitude, user.presentAddress.lat, user.presentAddress.lng);
        return dist <= RADIUS_KM;
    });

    console.log(`[Emergency] Broadcasting to ${nearbyUsers.length} users within 5km of ${title}`);

    // Send notifications to each nearby user
    const broadcastPromises = nearbyUsers.map(user => {
        // Skip the person who reported it (they already get a specific confirmation)
        if (complaint.user && user._id.toString() === complaint.user.toString()) return null;

        return sendNotification(user._id, {
            subject: `⚠️ EMERGENCY ALERT: ${title}`,
            message: `A high-risk emergency has been reported near your location (${title}). Please take necessary precautions. Ticket ID: ${ticketId}`,
            type: 'error',
            relatedTicket: _id
        });
    });

    await Promise.all(broadcastPromises.filter(p => p !== null));

  } catch (error) {
    console.error('Emergency Broadcast Error:', error);
  }
};

module.exports = {
  sendNotification,
  sendEmergencyAlertToNearbyUsers,
  haversineKm,
};
