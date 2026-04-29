/**
 * PDF Report Service
 * 
 * Generates downloadable PDF reports for:
 * - Individual complaint cases
 * - Aggregated monthly/yearly summaries
 * - Executive summaries for administrative review
 */

const PDFDocument = require('pdfkit');
const Complaint = require('../models/Complaint.model');
const User = require('../models/User.model');

// Helper: Format date for display
const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Helper: Format date only
const formatDateOnly = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Helper: Calculate time difference
const getTimeDiff = (start, end) => {
  if (!start || !end) return 'N/A';
  const diff = new Date(end) - new Date(start);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} day(s), ${hours % 24} hour(s)`;
  return `${hours} hour(s)`;
};

/**
 * Generate Individual Complaint PDF Report
 */
const generateComplaintReport = async (complaintId) => {
  const complaint = await Complaint.findById(complaintId)
    .populate('user', 'name email phone')
    .populate('escalation.escalatedBy', 'name')
    .populate('history.updatedBy', 'name')
    .populate('votes', 'name');

  if (!complaint) {
    throw new Error('Complaint not found');
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ─────────────────────────────────────────────────────────────
      // HEADER
      // ─────────────────────────────────────────────────────────────
      doc.fontSize(20).font('Helvetica-Bold').text('COMPLAINT CASE REPORT', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text('Shomadhan - Civic Issue Tracking System', { align: 'center' });
      doc.moveDown(2);

      // ─────────────────────────────────────────────────────────────
      // TICKET INFORMATION
      // ─────────────────────────────────────────────────────────────
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a1a').text('Ticket Information');
      doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica');
      const ticketInfo = [
        ['Ticket ID:', complaint.ticketId],
        ['Status:', complaint.status.toUpperCase()],
        ['Priority:', complaint.priority],
        ['Category:', complaint.category],
        ['Created:', formatDate(complaint.createdAt)],
        ['Last Updated:', formatDate(complaint.updatedAt)],
      ];

      ticketInfo.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').text(label, { continued: true, indent: 0 });
        doc.font('Helvetica').text(value);
      });

      doc.moveDown(1);

      // ─────────────────────────────────────────────────────────────
      // COMPLAINT DETAILS
      // ─────────────────────────────────────────────────────────────
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a1a').text('Complaint Details');
      doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica');
      doc.font('Helvetica-Bold').text('Title: ', { continued: true });
      doc.font('Helvetica').text(complaint.title);
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('Description: ');
      doc.font('Helvetica').text(complaint.description, { indent: 0 });
      doc.moveDown(1);

      // ─────────────────────────────────────────────────────────────
      // LOCATION & CONTACT
      // ─────────────────────────────────────────────────────────────
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a1a').text('Location & Contact');
      doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica');
      doc.font('Helvetica-Bold').text('Location: ', { continued: true });
      doc.font('Helvetica').text(complaint.location || 'Not specified');
      doc.moveDown(0.3);

      if (complaint.latitude && complaint.longitude) {
        doc.font('Helvetica-Bold').text('Coordinates: ', { continued: true });
        doc.font('Helvetica').text(`${complaint.latitude}, ${complaint.longitude}`);
        doc.moveDown(0.3);
      }

      doc.font('Helvetica-Bold').text('Anonymous: ', { continued: true });
      doc.font('Helvetica').text(complaint.isAnonymous ? 'Yes' : 'No');
      doc.moveDown(0.3);

      if (!complaint.isAnonymous && complaint.user) {
        doc.font('Helvetica-Bold').text('Submitted By: ', { continued: true });
        doc.font('Helvetica').text(complaint.user.name || 'Unknown');
        doc.moveDown(0.3);
        
        if (complaint.user.email) {
          doc.font('Helvetica-Bold').text('Email: ', { continued: true });
          doc.font('Helvetica').text(complaint.user.email);
          doc.moveDown(0.3);
        }
      }

      doc.moveDown(1);

      // ─────────────────────────────────────────────────────────────
      // STATUS HISTORY
      // ─────────────────────────────────────────────────────────────
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a1a').text('Status History');
      doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      if (complaint.history && complaint.history.length > 0) {
        doc.fontSize(10).font('Helvetica');
        complaint.history.forEach((entry, index) => {
          doc.font('Helvetica-Bold').text(`${index + 1}. `, { continued: true });
          doc.font('Helvetica').text(`${entry.status} - ${entry.message || 'No message'}`);
          doc.font('Helvetica-Oblique').text(` (${formatDate(entry.updatedAt)})`, { indent: 0 });
          doc.moveDown(0.3);
        });
      } else {
        doc.fontSize(10).font('Helvetica').text('No status history available.');
      }

      doc.moveDown(1);

      // ─────────────────────────────────────────────────────────────
      // ESCALATION RECORDS
      // ─────────────────────────────────────────────────────────────
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a1a').text('Escalation Records');
      doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      if (complaint.escalationHistory && complaint.escalationHistory.length > 0) {
        doc.fontSize(10).font('Helvetica');
        complaint.escalationHistory.forEach((entry, index) => {
          doc.font('Helvetica-Bold').text(`Level: ${entry.level} `, { continued: true });
          doc.font('Helvetica').text(`- ${entry.reason}`);
          doc.moveDown(0.3);
          doc.font('Helvetica-Oblique').text(`Escalated: ${formatDate(entry.escalatedAt)} | Auto: ${entry.isAuto ? 'Yes' : 'No'}`);
          if (entry.notes) {
            doc.moveDown(0.3);
            doc.font('Helvetica').text(`Notes: ${entry.notes}`);
          }
          doc.moveDown(0.5);
        });
      } else {
        doc.fontSize(10).font('Helvetica').text('No escalation records available.');
      }

      doc.moveDown(1);

      // ─────────────────────────────────────────────────────────────
      // SLA COMPLIANCE
      // ─────────────────────────────────────────────────────────────
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a1a').text('SLA Compliance');
      doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica');
      doc.font('Helvetica-Bold').text('SLA Deadline: ', { continued: true });
      doc.font('Helvetica').text(complaint.sla?.deadline ? formatDate(complaint.sla.deadline) : 'Not set');
      doc.moveDown(0.3);

      doc.font('Helvetica-Bold').text('SLA Breached: ', { continued: true });
      doc.font('Helvetica').text(complaint.sla?.breached ? 'Yes' : 'No');
      doc.moveDown(0.3);

      if (complaint.sla?.breachedAt) {
        doc.font('Helvetica-Bold').text('Breached At: ', { continued: true });
        doc.font('Helvetica').text(formatDate(complaint.sla.breachedAt));
        doc.moveDown(0.3);
      }

      if (complaint.sla?.responseTime) {
        doc.font('Helvetica-Bold').text('Response Time: ', { continued: true });
        doc.font('Helvetica').text(getTimeDiff(complaint.createdAt, complaint.sla.responseTime));
        doc.moveDown(0.3);
      }

      if (complaint.sla?.resolutionTime) {
        doc.font('Helvetica-Bold').text('Resolution Time: ', { continued: true });
        doc.font('Helvetica').text(getTimeDiff(complaint.createdAt, complaint.sla.resolutionTime));
        doc.moveDown(0.3);
      }

      doc.moveDown(1);

      // ─────────────────────────────────────────────────────────────
      // EVIDENCE REFERENCES
      // ─────────────────────────────────────────────────────────────
      if (complaint.evidence && complaint.evidence.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a1a').text('Evidence Files');
        doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        doc.fontSize(10).font('Helvetica');
        complaint.evidence.forEach((ev, index) => {
          doc.text(`${index + 1}. ${ev.type.toUpperCase()} - ${ev.url}`);
        });
        doc.moveDown(1);
      }

      // ─────────────────────────────────────────────────────────────
      // DEPARTMENT ASSIGNMENTS
      // ─────────────────────────────────────────────────────────────
      if (complaint.nlpAnalysis?.suggestedDepartment) {
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a1a').text('Department Assignment');
        doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        doc.fontSize(10).font('Helvetica');
        doc.font('Helvetica-Bold').text('Assigned Department: ', { continued: true });
        doc.font('Helvetica').text(complaint.nlpAnalysis.suggestedDepartment.name || 'Not assigned');
        doc.moveDown(0.3);

        doc.font('Helvetica-Bold').text('NLP Category: ', { continued: true });
        doc.font('Helvetica').text(complaint.nlpAnalysis.suggestedCategory || 'N/A');
        doc.moveDown(0.3);

        if (complaint.nlpAnalysis.keywords) {
          doc.font('Helvetica-Bold').text('Keywords: ', { continued: true });
          doc.font('Helvetica').text(complaint.nlpAnalysis.keywords.join(', '));
          doc.moveDown(0.3);
        }

        doc.moveDown(1);
      }

      // ─────────────────────────────────────────────────────────────
      // VOTES & ENGAGEMENT
      // ─────────────────────────────────────────────────────────────
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a1a').text('Engagement');
      doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica');
      doc.font('Helvetica-Bold').text('Vote Count: ', { continued: true });
      doc.font('Helvetica').text(complaint.voteCount.toString());
      doc.moveDown(0.3);

      doc.font('Helvetica-Bold').text('Emergency Flag: ', { continued: true });
      doc.font('Helvetica').text(complaint.emergencyFlag ? 'Yes' : 'No');
      doc.moveDown(1);

      // ─────────────────────────────────────────────────────────────
      // FOOTER
      // ─────────────────────────────────────────────────────────────
      const pageHeight = doc.page.height;
      doc.fontSize(8).font('Helvetica-Oblique').fillColor('#666666');
      doc.text(
        `Report generated on ${new Date().toLocaleString()} | Shomadhan - Civic Issue Tracking System`,
        50,
        pageHeight - 50,
        { align: 'center', width: 500 }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate Aggregated Summary PDF Report
 */
const generateSummaryReport = async (startDate, endDate, type = 'monthly') => {
  // Parse dates
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Get complaint statistics
  const complaints = await Complaint.find({
    createdAt: { $gte: start, $lte: end },
  })
    .populate('user', 'name')
    .lean();

  // Calculate statistics
  const totalComplaints = complaints.length;
  const byStatus = {};
  const byPriority = {};
  const byCategory = {};
  const byEscalationLevel = {};
  let resolvedCount = 0;
  let breachedCount = 0;

  complaints.forEach((c) => {
    // Status
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    if (c.status === 'resolved') resolvedCount++;

    // Priority
    byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;

    // Category
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;

    // Escalation
    byEscalationLevel[c.escalation?.currentLevel || 'initial'] = 
      (byEscalationLevel[c.escalation?.currentLevel || 'initial'] || 0) + 1;

    // SLA
    if (c.sla?.breached) breachedCount++;
  });

  // Calculate resolution rate
  const resolutionRate = totalComplaints > 0 ? ((resolvedCount / totalComplaints) * 100).toFixed(1) : 0;
  const slaComplianceRate = totalComplaints > 0 ? (((totalComplaints - breachedCount) / totalComplaints) * 100).toFixed(1) : 100;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ─────────────────────────────────────────────────────────────
      // HEADER
      // ─────────────────────────────────────────────────────────────
      doc.fontSize(20).font('Helvetica-Bold').text('AGGREGATED COMPLAINT SUMMARY', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text(`Shomadhan - Civic Issue Tracking System`, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Oblique').text(
        `${type === 'monthly' ? 'Monthly' : 'Yearly'} Report: ${formatDateOnly(start)} - ${formatDateOnly(end)}`,
        { align: 'center' }
      );
      doc.moveDown(2);

      // ─────────────────────────────────────────────────────────────
      // EXECUTIVE SUMMARY
      // ─────────────────────────────────────────────────────────────
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a1a').text('Executive Summary');
      doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica');
      doc.text(`This ${type} report provides a comprehensive overview of civic complaints handled by the Shomadhan system during the specified period.`);
      doc.moveDown(1);

      // Key Metrics
      doc.fontSize(12).font('Helvetica-Bold').text('Key Performance Indicators:');
      doc.moveDown(0.5);

      const metrics = [
        ['Total Complaints:', totalComplaints.toString()],
        ['Resolved:', resolvedCount.toString()],
        ['Resolution Rate:', `${resolutionRate}%`],
        ['SLA Compliance:', `${slaComplianceRate}%`],
        ['SLA Breaches:', breachedCount.toString()],
      ];

      doc.fontSize(10).font('Helvetica');
      metrics.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').text(label, { continued: true, indent: 0 });
        doc.font('Helvetica').text(value);
      });

      doc.moveDown(2);

      // ─────────────────────────────────────────────────────────────
      // STATUS BREAKDOWN
      // ─────────────────────────────────────────────────────────────
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a1a').text('Status Breakdown');
      doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica');
      Object.entries(byStatus).forEach(([status, count]) => {
        const percentage = ((count / totalComplaints) * 100).toFixed(1);
        doc.text(`• ${status.charAt(0).toUpperCase() + status.slice(1)}: ${count} (${percentage}%)`);
      });

      doc.moveDown(1);

      // ─────────────────────────────────────────────────────────────
      // PRIORITY BREAKDOWN
      // ─────────────────────────────────────────────────────────────
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a1a').text('Priority Breakdown');
      doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica');
      Object.entries(byPriority).forEach(([priority, count]) => {
        const percentage = ((count / totalComplaints) * 100).toFixed(1);
        doc.text(`• ${priority}: ${count} (${percentage}%)`);
      });

      doc.moveDown(1);

      // ─────────────────────────────────────────────────────────────
      // CATEGORY BREAKDOWN
      // ─────────────────────────────────────────────────────────────
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a1a').text('Category Breakdown');
      doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica');
      Object.entries(byCategory).forEach(([category, count]) => {
        const percentage = ((count / totalComplaints) * 100).toFixed(1);
        doc.text(`• ${category}: ${count} (${percentage}%)`);
      });

      doc.moveDown(1);

      // ─────────────────────────────────────────────────────────────
      // ESCALATION LEVELS
      // ─────────────────────────────────────────────────────────────
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a1a').text('Escalation Status');
      doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica');
      Object.entries(byEscalationLevel).forEach(([level, count]) => {
        const percentage = ((count / totalComplaints) * 100).toFixed(1);
        doc.text(`• ${level.charAt(0).toUpperCase() + level.slice(1)}: ${count} (${percentage}%)`);
      });

      doc.moveDown(1);

      // ─────────────────────────────────────────────────────────────
      // TOP COMPLAINTS (by votes)
      // ─────────────────────────────────────────────────────────────
      const topComplaints = complaints
        .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))
        .slice(0, 10);

      if (topComplaints.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a1a').text('Top 10 Complaints (by votes)');
        doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        doc.fontSize(9).font('Helvetica');
        topComplaints.forEach((c, index) => {
          doc.text(
            `${index + 1}. [${c.ticketId}] ${c.title.substring(0, 50)}${c.title.length > 50 ? '...' : ''} - ${c.voteCount || 0} votes - ${c.status}`
          );
        });
      }

      doc.moveDown(2);

      // ─────────────────────────────────────────────────────────────
      // FOOTER
      // ─────────────────────────────────────────────────────────────
      const pageHeight = doc.page.height;
      doc.fontSize(8).font('Helvetica-Oblique').fillColor('#666666');
      doc.text(
        `Report generated on ${new Date().toLocaleString()} | Shomadhan - Civic Issue Tracking System`,
        50,
        pageHeight - 50,
        { align: 'center', width: 500 }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateComplaintReport,
  generateSummaryReport,
};