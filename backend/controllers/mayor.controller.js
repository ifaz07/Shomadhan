const Complaint = require('../models/Complaint.model');
const User = require('../models/User.model');
const Groq = require('groq-sdk');
const { sendNotification } = require('../services/notificationService');
const nodemailer = require('nodemailer');

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * @desc    Generate an AI summary of complaints for a specific timeframe
 * @route   POST /api/v1/mayor/chat-briefing
 * @access  Private/Mayor
 */
exports.getChatBriefing = async (req, res, next) => {
  try {
    const { timeframe } = req.body;
    
    // 1. Calculate Date Math
    let startDate = new Date();
    if (timeframe === 'yesterday') {
      startDate.setDate(startDate.getDate() - 1);
    } else if (timeframe === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeframe === 'month') {
      startDate.setDate(startDate.getDate() - 30);
    } else {
      return res.status(400).json({ success: false, message: "Invalid timeframe" });
    }

    // 2. Fetch Detailed Data
    const totalCount = await Complaint.countDocuments({ createdAt: { $gte: startDate } });
    
    const complaints = await Complaint.find({ createdAt: { $gte: startDate } })
      .select('title category status voteCount locationName createdAt')
      .sort({ voteCount: -1 })
      .limit(50)
      .lean();

    if (totalCount === 0) {
      return res.status(200).json({
        success: true,
        summary: `No complaints were reported during this ${timeframe}. The city is currently quiet.`
      });
    }

    // Identify top voted cases
    const topVoted = complaints.slice(0, 3).map(c => `"${c.title}" (${c.voteCount} votes)`).join(', ');

    // 3. Format data for LLM
    let dataString = complaints.map(c => 
      `Cat: ${c.category}, Status: ${c.status}, Area: ${c.locationName || 'Unknown'}, Votes: ${c.voteCount}`
    ).join(' | ');

    console.log(`Found ${totalCount} complaints. LLM Data sample size: ${complaints.length}`);

    // Safety: truncate if too long for the prompt
    if (dataString.length > 2000) {
      dataString = dataString.substring(0, 2000) + "... [truncated]";
    }

    // 4. Groq API Call
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a professional Civic Data Analyst for the City Mayor's Office. Your goal is to provide specific, data-driven executive summaries. Always include the exact total number of complaints and provide a detailed analysis of the nature and content of the complaints. Mention the titles of the top voted cases specifically. Do not mention geographical areas or locations."
        },
        {
          role: "user",
          content: `Analysis Request for: ${timeframe}
          Total Complaints in this period: ${totalCount}
          Top Voted Cases: ${topVoted}
          Raw Data (Sample of 50): ${dataString}
          
          Please generate a 3-sentence summary that explicitly states the total count, describes the primary nature/categories of these complaints in detail, and names the top voted issues.`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 300,
    });

    const summary = chatCompletion.choices[0]?.message?.content || "I'm sorry Mayor, I couldn't generate a summary at this moment.";

    res.status(200).json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Groq Error:', error);
    res.status(500).json({ 
      success: false, 
      message: `AI Error: ${error.message || 'Unknown error'}` 
    });
  }
};

/**
 * @desc    Get all citizens ranked by points
 * @route   GET /api/v1/mayor/citizens-points
 * @access  Private/Mayor
 */
exports.getCitizensByPoints = async (req, res, next) => {
  try {
    const citizens = await User.find({ role: 'citizen' })
      .select('name email points isGoodCitizen avatar')
      .sort({ points: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: citizens
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper to send email to the winner
 */
const sendWinnerEmail = async (user, badgeName) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"City Mayor" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Congratulations! You are the Good Citizen of the Month!',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0d9488;">Hello ${user.name},</h2>
          <p>We are thrilled to announce that you have been recognized as the <strong>Good Citizen of the Month</strong>!</p>
          <p>Your active participation and contribution to our city's improvement have earned you the prestigious gold star badge on your profile.</p>
          <div style="background: #f0fdfa; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
             <span style="font-size: 40px;">⭐</span>
             <h3 style="margin: 10px 0; color: #0f766e;">${badgeName}</h3>
          </div>
          <p>Keep up the great work!</p>
          <p>Best regards,<br/>The Mayor's Office</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Email Error:', error);
  }
};

/**
 * @desc    Announce Good Citizen of the Month (highest points)
 * @route   POST /api/v1/mayor/announce-winner
 * @access  Private/Mayor
 */
exports.announceGoodCitizen = async (req, res, next) => {
  try {
    console.log('--- Start Announce Winner Logic ---');
    // 1. Find the citizen with the most points who is NOT already a winner
    const winner = await User.findOne({ role: 'citizen', isGoodCitizen: false })
      .sort({ points: -1, createdAt: 1 });

    if (!winner) {
      console.log('No eligible winner found (all citizens might already have stars or none exist)');
      return res.status(200).json({ 
        success: false, 
        message: "No eligible citizens found. Everyone might already be recognized!" 
      });
    }

    console.log(`Selected Winner: ${winner.name} (${winner.email}) with ${winner.points} points.`);

    const badgeName = `Good Citizen of ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`;

    // 2. Remove "Good Citizen" status from everyone else
    await User.updateMany({ isGoodCitizen: true }, { isGoodCitizen: false });

    // 3. Award the winner
    winner.isGoodCitizen = true;
    winner.badges = winner.badges || [];
    winner.badges.push({
      name: badgeName,
      awardedAt: new Date()
    });
    
    await winner.save();
    console.log('Winner saved successfully.');

    // 4. Send Notifications (Wrap in try/catch so winner is announced even if mail fails)
    try {
      await sendNotification(winner._id, {
        subject: "⭐ Good Citizen Award!",
        message: `Congratulations! You have been recognized as the Good Citizen of the Month. A gold star has been added to your profile.`,
        type: "success"
      });
      await sendWinnerEmail(winner, badgeName);
      console.log('Notifications sent.');
    } catch (notifyErr) {
      console.error('Notification Error (Non-critical):', notifyErr);
    }

    res.status(200).json({
      success: true,
      message: `${winner.name} has been announced as the Good Citizen of the Month!`,
      winner
    });
  } catch (error) {
    console.error('CRITICAL Announce Winner Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Remove Good Citizen badge from a user
 * @route   POST /api/v1/mayor/remove-badge/:id
 * @access  Private/Mayor
 */
exports.removeGoodCitizenBadge = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.isGoodCitizen = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Recognition removed from ${user.name}.`,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard analytics for the Mayor
 * @route   GET /api/v1/mayor/dashboard-stats
 * @access  Private/Mayor
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    // 1. Global Complaint Counts
    const globalStats = await Complaint.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
          critical: {
            $sum: { $cond: [{ $eq: ['$priority', 'Critical'] }, 1, 0] },
          },
        },
      },
    ]);

    // 2. Department-wise performance
    const deptPerformance = await Complaint.aggregate([
      {
        $group: {
          _id: '$category',
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
          pendingInProgress: {
            $sum: {
              $cond: [
                { $in: ['$status', ['pending', 'in-progress']] },
                1,
                0,
              ],
            },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // 3. SLA Compliance (Exceeded deadline)
    const slaExceeded = await Complaint.countDocuments({
      status: { $ne: 'resolved' },
      slaDeadline: { $lt: new Date() },
    });

    res.status(200).json({
      success: true,
      data: {
        global: globalStats[0] || { total: 0, pending: 0, inProgress: 0, resolved: 0, critical: 0 },
        departments: deptPerformance,
        slaCompliance: {
          exceeded: slaExceeded,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
