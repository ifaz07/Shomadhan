/**
 * Reputation Service
 * 
 * Handles badge awards and credibility score calculation.
 */

// Badge definitions
const BADGE_DEFINITIONS = {
  // Reporting badges
  first_report: {
    id: 'first_report',
    name: 'First Report',
    description: 'Submitted your first complaint',
    icon: '📝',
    category: 'reporting',
    requirement: (stats) => stats.complaintsSubmitted >= 1,
  },
  active_reporter: {
    id: 'active_reporter',
    name: 'Active Reporter',
    description: 'Submitted 10 or more complaints',
    icon: '📊',
    category: 'reporting',
    requirement: (stats) => stats.complaintsSubmitted >= 10,
  },
  prolific_reporter: {
    id: 'prolific_reporter',
    name: 'Prolific Reporter',
    description: 'Submitted 50 or more complaints',
    icon: '🏆',
    category: 'reporting',
    requirement: (stats) => stats.complaintsSubmitted >= 50,
  },

  // Engagement badges
  engaged_citizen: {
    id: 'engaged_citizen',
    name: 'Engaged Citizen',
    description: 'Received 10 or more votes on your complaints',
    icon: '👍',
    category: 'engagement',
    requirement: (stats) => stats.votesReceived >= 10,
  },
  popular_voice: {
    id: 'popular_voice',
    name: 'Popular Voice',
    description: 'Received 50 or more votes on your complaints',
    icon: '🌟',
    category: 'engagement',
    requirement: (stats) => stats.votesReceived >= 50,
  },
  community_leader: {
    id: 'community_leader',
    name: 'Community Leader',
    description: 'Received 100 or more votes on your complaints',
    icon: '👑',
    category: 'engagement',
    requirement: (stats) => stats.votesReceived >= 100,
  },

  // Verification badges
  verified_citizen: {
    id: 'verified_citizen',
    name: 'Verified Citizen',
    description: 'Verified your identity with official documents',
    icon: '✅',
    category: 'verification',
    requirement: (stats) => stats.verifiedIdentity === true,
  },
  trusted_reporter: {
    id: 'trusted_reporter',
    name: 'Trusted Reporter',
    description: 'Achieved credibility score of 80 or higher',
    icon: '💎',
    category: 'verification',
    requirement: (stats, credibility) => credibility >= 80,
  },

  // Feedback badges
  constructive_feedback: {
    id: 'constructive_feedback',
    name: 'Constructive Feedback',
    description: 'Provided feedback on 5 or more resolved complaints',
    icon: '💬',
    category: 'engagement',
    requirement: (stats) => stats.feedbackPositive >= 5,
  },

  // Milestone badges
  early_adopter: {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Joined during the platform launch phase',
    icon: '🚀',
    category: 'milestone',
    requirement: (stats) => stats.earlyAdopter === true,
  },
  month_streak: {
    id: 'month_streak',
    name: 'Monthly Contributor',
    description: 'Maintained a 30-day reporting streak',
    icon: '🔥',
    category: 'milestone',
    requirement: (stats, credibility, streak) => streak?.longest >= 30,
  },
  quarter_streak: {
    id: 'quarter_streak',
    name: 'Quarterly Contributor',
    description: 'Maintained a 90-day reporting streak',
    icon: '⚡',
    category: 'milestone',
    requirement: (stats, credibility, streak) => streak?.longest >= 90,
  },
};

/**
 * Calculate credibility score based on user stats
 * Score ranges from 0-100
 */
const calculateCredibilityScore = (user) => {
  let score = 50; // Base score

  const stats = user.reputationBreakdown || {};
  const badges = user.badges || [];

  // Verification bonus (+20)
  if (stats.verifiedIdentity) {
    score += 20;
  }

  // Complaints submitted bonus (+10 max, +2 per complaint up to 5)
  if (stats.complaintsSubmitted) {
    score += Math.min(stats.complaintsSubmitted * 2, 10);
  }

  // Votes received bonus (+15 max, +1 per 5 votes)
  if (stats.votesReceived) {
    score += Math.min(Math.floor(stats.votesReceived / 5), 15);
  }

  // Positive feedback bonus (+10 max, +2 per feedback)
  if (stats.feedbackPositive) {
    score += Math.min(stats.feedbackPositive * 2, 10);
  }

  // Negative feedback penalty (-5 per negative, max -15)
  if (stats.feedbackNegative) {
    score -= Math.min(stats.feedbackNegative * 5, 15);
  }

  // Badge bonuses
  score += Math.min(badges.length * 3, 15);

  // Early adopter bonus
  if (stats.earlyAdopter) {
    score += 5;
  }

  // Ensure score is between 0-100
  return Math.max(0, Math.min(100, score));
};

/**
 * Award badges to user based on their stats
 */
const awardBadges = async (user) => {
  const newBadges = [];
  const stats = user.reputationBreakdown || {};
  const existingBadgeIds = user.badges?.map(b => b.id) || [];
  const credibility = user.credibilityScore || 50;
  const streak = user.reportingStreak || {};

  for (const [badgeId, badgeDef] of Object.entries(BADGE_DEFINITIONS)) {
    // Skip if user already has this badge
    if (existingBadgeIds.includes(badgeId)) {
      continue;
    }

    // Check if user meets badge requirements
    if (badgeDef.requirement(stats, credibility, streak)) {
      newBadges.push({
        id: badgeDef.id,
        name: badgeDef.name,
        description: badgeDef.description,
        icon: badgeDef.icon,
        earnedAt: new Date(),
        category: badgeDef.category,
      });
    }
  }

  // Add new badges to user
  if (newBadges.length > 0) {
    user.badges = [...(user.badges || []), ...newBadges];
    
    // Calculate reputation points for new badges
    const badgePoints = newBadges.length * 25;
    user.reputation = (user.reputation || 0) + badgePoints;
  }

  return newBadges;
};

/**
 * Update user reputation when they submit a complaint
 */
const onComplaintSubmitted = async (user) => {
  if (!user) return;

  // Increment complaints submitted
  user.reputationBreakdown.complaintsSubmitted = (user.reputationBreakdown.complaintsSubmitted || 0) + 1;
  
  // Update reporting streak
  const now = new Date();
  const lastReported = user.reportingStreak?.lastReportedAt;
  
  if (lastReported) {
    const daysSinceLastReport = Math.floor((now - new Date(lastReported)) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastReport <= 1) {
      // Continue streak
      user.reportingStreak.current = (user.reportingStreak.current || 0) + 1;
      user.reportingStreak.longest = Math.max(user.reportingStreak.longest || 0, user.reportingStreak.current);
    } else {
      // Reset streak
      user.reportingStreak.current = 1;
    }
  } else {
    // First complaint
    user.reportingStreak.current = 1;
    user.reportingStreak.longest = 1;
  }
  
  user.reportingStreak.lastReportedAt = now;

  // Add reputation points for submitting (+5)
  user.reputation = (user.reputation || 0) + 5;

  // Update credibility score
  user.credibilityScore = calculateCredibilityScore(user);

  // Check for badge awards
  await awardBadges(user);
};

/**
 * Update user reputation when their complaint is resolved
 */
const onComplaintResolved = async (user) => {
  if (!user) return;

  // Increment resolved complaints
  user.reputationBreakdown.complaintsResolved = (user.reputationBreakdown.complaintsResolved || 0) + 1;

  // Add reputation points for resolution (+10)
  user.reputation = (user.reputation || 0) + 10;

  // Update credibility score
  user.credibilityScore = calculateCredibilityScore(user);

  // Check for badge awards
  await awardBadges(user);
};

/**
 * Update user reputation when they receive votes
 */
const onVotesReceived = async (user, voteCount) => {
  if (!user) return;

  // Increment votes received
  user.reputationBreakdown.votesReceived = (user.reputationBreakdown.votesReceived || 0) + voteCount;

  // Add reputation points (+1 per vote)
  user.reputation = (user.reputation || 0) + voteCount;

  // Update credibility score
  user.credibilityScore = calculateCredibilityScore(user);

  // Check for badge awards
  await awardBadges(user);
};

/**
 * Get all available badges (for display purposes)
 */
const getAllBadges = () => {
  return Object.values(BADGE_DEFINITIONS).map(badge => ({
    id: badge.id,
    name: badge.name,
    description: badge.description,
    icon: badge.icon,
    category: badge.category,
  }));
};

/**
 * Get user's badge progress
 */
const getBadgeProgress = (user) => {
  const stats = user.reputationBreakdown || {};
  const credibility = user.credibilityScore || 50;
  const streak = user.reportingStreak || {};
  const existingBadgeIds = user.badges?.map(b => b.id) || [];

  const progress = {};

  for (const [badgeId, badgeDef] of Object.entries(BADGE_DEFINITIONS)) {
    const earned = existingBadgeIds.includes(badgeId);
    let nextRequirement = null;

    if (!earned) {
      // Calculate progress percentage
      let progressValue = 0;
      
      switch (badgeId) {
        case 'first_report':
          progressValue = stats.complaintsSubmitted ? 100 : 0;
          nextRequirement = 'Submit your first complaint';
          break;
        case 'active_reporter':
          progressValue = Math.min((stats.complaintsSubmitted || 0) * 10, 100);
          nextRequirement = `${10 - (stats.complaintsSubmitted || 0)} more complaints to earn`;
          break;
        case 'prolific_reporter':
          progressValue = Math.min((stats.complaintsSubmitted || 0) * 2, 100);
          nextRequirement = `${50 - (stats.complaintsSubmitted || 0)} more complaints to earn`;
          break;
        case 'engaged_citizen':
          progressValue = Math.min((stats.votesReceived || 0) * 10, 100);
          nextRequirement = `${10 - Math.floor((stats.votesReceived || 0))} more votes to earn`;
          break;
        case 'popular_voice':
          progressValue = Math.min((stats.votesReceived || 0) * 2, 100);
          nextRequirement = `${50 - (stats.votesReceived || 0)} more votes to earn`;
          break;
        case 'community_leader':
          progressValue = Math.min((stats.votesReceived || 0), 100);
          nextRequirement = `${100 - (stats.votesReceived || 0)} more votes to earn`;
          break;
        case 'verified_citizen':
          progressValue = stats.verifiedIdentity ? 100 : 0;
          nextRequirement = stats.verifiedIdentity ? 'Earned!' : 'Verify your identity';
          break;
        case 'trusted_reporter':
          progressValue = Math.min(credibility * 1.25, 100);
          nextRequirement = `${80 - credibility} more credibility points needed`;
          break;
        case 'constructive_feedback':
          progressValue = Math.min((stats.feedbackPositive || 0) * 20, 100);
          nextRequirement = `${5 - (stats.feedbackPositive || 0)} more feedback to give`;
          break;
        case 'month_streak':
          progressValue = Math.min((streak.longest || 0) * 3.33, 100);
          nextRequirement = `${30 - (streak.longest || 0)} more days needed`;
          break;
        case 'quarter_streak':
          progressValue = Math.min((streak.longest || 0) * 1.11, 100);
          nextRequirement = `${90 - (streak.longest || 0)} more days needed`;
          break;
        default:
          progressValue = 0;
      }

      progress[badgeId] = {
        ...badgeDef,
        earned,
        progress: Math.round(progressValue),
        nextRequirement,
      };
    } else {
      progress[badgeId] = {
        ...badgeDef,
        earned: true,
        progress: 100,
        nextRequirement: null,
      };
    }
  }

  return progress;
};

module.exports = {
  BADGE_DEFINITIONS,
  calculateCredibilityScore,
  awardBadges,
  onComplaintSubmitted,
  onComplaintResolved,
  onVotesReceived,
  getAllBadges,
  getBadgeProgress,
};