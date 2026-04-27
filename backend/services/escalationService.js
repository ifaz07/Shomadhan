const cron = require('node-cron');
const Complaint = require('../models/Complaint.model');

/**
 * Escalation Engine
 * Runs every minute for testing to check for complaints that have breached SLA (1 minute).
 */
const initEscalationEngine = () => {
  // Schedule: Every minute for testing (* * * * *)
  cron.schedule('* * * * *', async () => {
    console.log('[Escalation Engine] Running 1-minute check...');
    
    try {
      // For testing: Check for anything older than 1 minute
      const oneMinuteAgo = new Date(Date.now() - 48 * 60  * 60 * 1000);

      // 1. Query for candidates
      const complaints = await Complaint.find({
        status: 'pending',
        current_authority_level: { $lt: 3 },
        last_escalated_at: { $lte: oneMinuteAgo }
      });

      if (complaints.length === 0) {
        console.log('[Escalation Engine] No complaints require escalation.');
        return;
      }

      console.log(`[Escalation Engine] Found ${complaints.length} complaints to escalate.`);

      const bulkOps = complaints.map(complaint => {
        const fromLevel = complaint.current_authority_level;
        const toLevel = fromLevel + 1;

        // ── Priority Escalation Logic ──
        // Low -> Medium -> High (stops at High)
        let newPriority = complaint.priority;
        if (complaint.priority === 'Low') {
            newPriority = 'Medium';
        } else if (complaint.priority === 'Medium') {
            newPriority = 'High';
        }
        // If it was already High or Critical, it stays that way.

        // Log the specific ticket being escalated
        console.log(`[Escalation Engine] ⬆️  Escalating Ticket: ${complaint.ticketId}`);
        console.log(`    Level: ${fromLevel} -> ${toLevel}`);
        console.log(`    Priority: ${complaint.priority} -> ${newPriority}`);

        return {
          updateOne: {
            filter: { _id: complaint._id },
            update: {
              $inc: { current_authority_level: 1 },
              $set: { 
                last_escalated_at: new Date(),
                priority: newPriority
              },
              $push: {
                history: {
                  action: 'SLA breached: Auto-escalated',
                  from_level: fromLevel,
                  to_level: toLevel,
                  status: 'pending',
                  message: `System auto-escalated this ticket (Priority: ${complaint.priority} -> ${newPriority}) due to inactivity.`,
                  date: new Date()
                }
              }
            }
          }
        };
      });

      const result = await Complaint.bulkWrite(bulkOps);
      console.log(`[Escalation Engine] ✅ Successfully escalated ${result.modifiedCount} tickets.`);

    } catch (error) {
      console.error('[Escalation Engine Error]:', error);
    }
  });

  console.log('[Escalation Engine] Scheduled to run every minute for testing.');
};

module.exports = { initEscalationEngine };
