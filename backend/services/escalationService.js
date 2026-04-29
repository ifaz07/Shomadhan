/**
 * Escalation Service
 * 
 * Handles automatic escalation of overdue complaints to higher authorities.
 * Runs as a scheduled job to check for overdue complaints and escalate them.
 */

const Complaint = require('../models/Complaint.model');
const User = require('../models/User.model');

// Escalation level configurations
const ESCALATION_CONFIG = {
  initial: {
    nextLevel: 'level1',
    notifyRoles: ['department_officer'],
    slaHours: { Critical: 4, High: 24, Medium: 72, Low: 168 },
  },
  level1: {
    nextLevel: 'level2',
    notifyRoles: ['department_officer', 'admin'],
    slaHours: { Critical: 2, High: 12, Medium: 36, Low: 84 },
  },
  level2: {
    nextLevel: 'level3',
    notifyRoles: ['admin', 'mayor'],
    slaHours: { Critical: 1, High: 6, Medium: 18, Low: 42 },
  },
  level3: {
    nextLevel: 'mayor',
    notifyRoles: ['mayor'],
    slaHours: { Critical: 0.5, High: 3, Medium: 9, Low: 24 },
  },
  mayor: {
    nextLevel: 'mayor',
    notifyRoles: ['mayor'],
    slaHours: { Critical: 0.25, High: 1, Medium: 4, Low: 12 },
  },
};

/**
 * Process overdue complaints and escalate them
 */
async function processOverdueComplaints() {
  console.log('[EscalationService] Checking for overdue complaints...');
  
  try {
    // Find all non-resolved, non-rejected complaints
    const overdueComplaints = await Complaint.find({
      status: { $nin: ['resolved', 'rejected'] },
      'sla.deadline': { $lt: new Date() },
      'sla.breached': false,
    });
    
    let escalatedCount = 0;
    
    for (const complaint of overdueComplaints) {
      try {
        await escalateComplaint(complaint);
        escalatedCount++;
      } catch (err) {
        console.error(`[EscalationService] Error escalating complaint ${complaint.ticketId}:`, err.message);
      }
    }
    
    // Also check for already overdue but not yet flagged complaints
    const alreadyOverdue = await Complaint.find({
      status: { $nin: ['resolved', 'rejected'] },
      'sla.deadline': { $lt: new Date() },
      'sla.breached': true,
      'escalation.isOverdue': false,
    });
    
    for (const complaint of alreadyOverdue) {
      complaint.escalation.isOverdue = true;
      complaint.escalation.overdueAt = new Date();
      await complaint.save();
    }
    
    console.log(`[EscalationService] Processed ${overdueComplaints.length} overdue complaints, escalated ${escalatedCount}`);
    return { checked: overdueComplaints.length, escalated: escalatedCount };
  } catch (error) {
    console.error('[EscalationService] Error processing overdue complaints:', error);
    throw error;
  }
}

/**
 * Escalate a single complaint to the next level
 */
async function escalateComplaint(complaint) {
  const currentLevel = complaint.escalation.currentLevel;
  const config = ESCALATION_CONFIG[currentLevel];
  
  if (!config || currentLevel === 'mayor') {
    // Already at highest level, just mark as overdue
    complaint.escalation.isOverdue = true;
    complaint.escalation.overdueAt = new Date();
    complaint.sla.breached = true;
    complaint.sla.breachedAt = new Date();
    await complaint.save();
    return complaint;
  }
  
  // Get system user for auto-escalation
  const systemUser = await User.findOne({ role: 'admin' }).select('_id');
  
  // Escalate to next level
  complaint.escalate(
    `Automatic escalation: SLA deadline exceeded for ${complaint.priority} priority complaint`,
    systemUser ? systemUser._id : null,
    true,
    `Auto-escalated from ${currentLevel} to ${config.nextLevel} due to SLA breach`
  );
  
  // Mark SLA as breached
  complaint.sla.breached = true;
  complaint.sla.breachedAt = new Date();
  
  // Calculate new SLA deadline for the new level
  const newSlaHours = config.slaHours[complaint.priority] || 24;
  const newDeadline = new Date();
  newDeadline.setHours(newDeadline.getHours() + newSlaHours);
  complaint.sla.deadline = newDeadline;
  
  await complaint.save();
  
  console.log(`[EscalationService] Escalated complaint ${complaint.ticketId} from ${currentLevel} to ${config.nextLevel}`);
  
  return complaint;
}

/**
 * Get escalation statistics
 */
async function getEscalationStats() {
  const stats = await Complaint.aggregate([
    {
      $match: {
        status: { $nin: ['resolved', 'rejected'] },
      },
    },
    {
      $group: {
        _id: '$escalation.currentLevel',
        count: { $sum: 1 },
        overdue: {
          $sum: { $cond: ['$escalation.isOverdue', 1, 0] },
        },
        breached: {
          $sum: { $cond: ['$sla.breached', 1, 0] },
        },
      },
    },
  ]);
  
  return stats;
}

/**
 * Get complaints that need attention at each level
 */
async function getEscalationQueue(level) {
  const complaints = await Complaint.find({
    'escalation.currentLevel': level,
    status: { $nin: ['resolved', 'rejected'] },
  })
    .select('ticketId title category priority status sla.deadline escalation.currentLevel createdAt')
    .sort('sla.deadline');
  
  return complaints;
}

module.exports = {
  processOverdueComplaints,
  escalateComplaint,
  getEscalationStats,
  getEscalationQueue,
  ESCALATION_CONFIG,
};