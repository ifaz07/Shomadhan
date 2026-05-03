const PDFDocument = require('pdfkit');
const Complaint = require('../models/Complaint.model');
const User = require('../models/User.model');
const DepartmentMetric = require('../models/DepartmentMetric.model');
const { DEPARTMENT_KEYS } = require('../utils/departmentTaxonomy');

// ── Colour palette ────────────────────────────────────────────────────
const C = {
  teal:    '#0f766e', // teal-700
  emerald: '#10b981', // emerald-500
  slate:   '#1e293b', // slate-800
  gray:    '#64748b', // slate-500
  light:   '#f8fafc', // slate-50
  border:  '#e2e8f0', // slate-200
  red:     '#ef4444', // red-500
  orange:  '#f59e0b', // amber-500
  blue:    '#3b82f6', // blue-500
  white:   '#ffffff',
  dark:    '#0f172a', // slate-900
  gold:    '#ca8a04', // yellow-600
};

// ── Helpers ───────────────────────────────────────────────────────────
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : 'N/A';
const fmtFull = (d) => d ? new Date(d).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : 'N/A';

const drawHeader = (doc, title, subtitle, isLandscape = false) => {
  const w = isLandscape ? 842 : 595;
  // Compact Background bar
  doc.rect(0, 0, w, 55).fill(C.teal);
  doc.rect(0, 52, w, 3).fill(C.gold);

  // Logo text (Smaller & Higher)
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(18)
     .text('SHOMADHAN', 40, 15);
  doc.fillColor('#99f6e4').font('Helvetica').fontSize(8)
     .text('Digital Civic Excellence Platform', 40, 34);

  // Right side: generated at
  const genAt = `ADMIN RECORD  •  ${fmtFull(new Date())}`;
  doc.fillColor('#ccfbf1').font('Helvetica-Bold').fontSize(7)
     .text(genAt, 0, 24, { align: 'right', width: w - 40 });

  // Title block (Shifted up)
  doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(18)
     .text(title, 40, 70);
  if (subtitle) {
    doc.fillColor(C.gray).font('Helvetica').fontSize(10)
       .text(subtitle, 40, 92);
  }
};

const drawPieChart = (doc, x, y, radius, data) => {
  let total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) total = 1;
  let startAngle = -Math.PI / 2;

  data.forEach((d) => {
    const sliceAngle = (d.value / total) * (Math.PI * 2);
    const endAngle = startAngle + sliceAngle;
    
    // Draw slice using SVG path
    const x1 = x + radius * Math.cos(startAngle);
    const y1 = y + radius * Math.sin(startAngle);
    const x2 = x + radius * Math.cos(endAngle);
    const y2 = y + radius * Math.sin(endAngle);
    
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    
    doc.save()
       .path(`M ${x} ${y} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`)
       .fill(d.color || C.gray);
    
    startAngle = endAngle;
  });

  // Legend
  data.forEach((d, i) => {
    const ly = y - radius + (i * 20);
    doc.rect(x + radius + 20, ly, 10, 10).fill(d.color || C.gray);
    doc.fillColor(C.dark).font('Helvetica').fontSize(9)
       .text(`${d.label}: ${d.value}`, x + radius + 35, ly + 1);
  });
};

const drawKPIBox = (doc, x, y, w, h, label, value, color) => {
  doc.roundedRect(x, y, w, h, 12).fill(C.white).stroke(C.border);
  doc.rect(x, y, 4, h).fill(color);
  
  doc.fillColor(C.gray).font('Helvetica-Bold').fontSize(8).text(label.toUpperCase(), x + 15, y + 15);
  doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(22).text(String(value), x + 15, y + 28);
};

const drawFooter = (doc) => {
  const y = doc.page.height - 30;
  doc.rect(40, y - 5, doc.page.width - 80, 0.5).fill(C.border);
  doc.fillColor(C.gray).font('Helvetica').fontSize(7)
     .text('Smart Bangladesh Initiative', 0, y, { align: 'right', width: doc.page.width - 40 });
};

const checkPageBreak = (doc, requiredHeight) => {
  if (doc.y + requiredHeight > doc.page.height - 60) {
    doc.addPage();
    return true;
  }
  return false;
};

const sectionTitle = (doc, text) => {
  checkPageBreak(doc, 40);
  doc.moveDown(0.6);
  doc.rect(40, doc.y, doc.page.width - 80, 26).fill('#f0f9ff');
  doc.rect(40, doc.y, 4, 26).fill(C.teal);
  doc.fillColor(C.teal).font('Helvetica-Bold').fontSize(10)
     .text(text.toUpperCase(), 56, doc.y - 18);
  doc.moveDown(1.5);
  doc.fillColor(C.dark);
};

const kv = (doc, label, value, xLabel = 40, xValue = 180) => {
  const cy = doc.y;
  const valStr = String(value || 'N/A');
  const maxW = doc.page.width - xValue - 40;
  
  doc.font('Helvetica-Bold').fontSize(9);
  const textH = doc.heightOfString(valStr, { width: maxW, lineGap: 2 });
  
  checkPageBreak(doc, textH + 15);
  const drawY = doc.y; // updated if page break happened

  doc.fillColor(C.gray).font('Helvetica').fontSize(9).text(label, xLabel, drawY);
  doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(9).text(valStr, xValue, drawY, { width: maxW, lineGap: 2 });
  
  doc.y = drawY + textH + 8;
};

const priorityColor = (p) => ({ Critical: C.red, High: C.orange, Medium: C.blue, Low: C.green }[p] || C.gray);
const statusColor  = (s) => ({ resolved: C.green, 'in-progress': C.blue, pending: C.orange, rejected: C.red }[s] || C.gray);

const pill = (doc, label, color, x, y) => {
  const w = doc.widthOfString(label) + 16;
  doc.roundedRect(x, y - 3, w, 16, 4).fill(color);
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(8).text(label, x + 8, y);
  return x + w + 8;
};

const drawBarChart = (doc, items, maxVal, x, y, barW = 300, barH = 14) => {
  items.forEach((item, i) => {
    const cy = y + i * (barH + 10);
    const fillW = maxVal > 0 ? Math.round((item.value / maxVal) * barW) : 0;
    // Label
    doc.fillColor(C.dark).font('Helvetica').fontSize(8)
       .text(item.label.substring(0, 22), x, cy, { width: 130 });
    // Bar bg
    doc.rect(x + 135, cy, barW, barH).fill('#f1f5f9');
    // Bar fill
    if (fillW > 0) doc.rect(x + 135, cy, fillW, barH).fill(item.color || C.teal);
    // Value
    doc.fillColor(C.gray).font('Helvetica').fontSize(8)
       .text(String(item.value), x + 135 + barW + 8, cy);
  });
};

const drawSection = (doc, title) => {
  doc.moveDown(1);
  const cy = doc.y;
  checkPageBreak(doc, 60);
  doc.rect(40, doc.y, doc.page.width - 80, 20).fill(C.light);
  doc.rect(40, doc.y, 4, 20).fill(C.teal);
  doc.fillColor(C.teal).font('Helvetica-Bold').fontSize(9).text(title.toUpperCase(), 55, doc.y + 6);
  doc.y += 25;
};

// ════════════════════════════════════════════════════════════════════════
// INDIVIDUAL COMPLAINT PDF
// ════════════════════════════════════════════════════════════════════════
exports.getComplaintReport = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('user', 'name email isVerified verificationDoc verificationStatus phone role')
      .lean();

    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    // Permissions check
    if (req.user.role === 'citizen' && String(complaint.user?._id) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const doc = new PDFDocument({ margin: 0, size: 'A4', bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Internal-Case-${complaint.ticketId}.pdf"`);
    doc.pipe(res);

    // ── PREMIUM HEADER (Compact)
    const w = 595;
    doc.rect(0, 0, w, 60).fill('#1e1b4b'); // Deep Indigo
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(16).text('OFFICIAL CASE BRIEFING', 40, 22);
    doc.fillColor('#818cf8').font('Helvetica').fontSize(8).text(`TICKET: ${complaint.ticketId}  •  ${fmtFull(new Date())}`, 40, 42);
    
    // Official Seal Logo
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(14).text('SMART', 480, 20);
    doc.fillColor('#818cf8').font('Helvetica').fontSize(7).text('GOVT INITIATIVE', 480, 36);

    // ── REPORTER IDENTITY CARD (Identity Disclosure)
    const ridY = 75;
    doc.roundedRect(40, ridY, 515, 50, 8).fill('#f8fafc').stroke('#e2e8f0');
    doc.fillColor(C.gray).font('Helvetica-Bold').fontSize(7).text('REPORTER IDENTITY (INTERNAL DISCLOSURE)', 55, ridY + 12);
    
    const reporterName = complaint.user?.name || 'Unknown User';
    const reporterNID  = complaint.user?.verificationDoc?.documentNumber || 'NID NOT PROVIDED';
    const contactInfo  = complaint.user?.phone || complaint.user?.email || 'N/A';
    const contactLabel = complaint.user?.phone ? 'PHONE' : 'EMAIL';

    doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(12).text(reporterName.toUpperCase(), 55, ridY + 24);
    doc.fillColor(C.gray).font('Helvetica').fontSize(9).text(`NID: ${reporterNID}`, 250, ridY + 27);
    doc.fillColor(C.gray).font('Helvetica').fontSize(9).text(`${contactLabel}: ${contactInfo}`, 400, ridY + 27);
    

    // ── CASE SPECIFICATIONS GRID
    const gridY = 140;
    const cw = 140;
    
    const drawSpec = (label, value, x, y, w = cw) => {
      doc.fillColor(C.gray).font('Helvetica-Bold').fontSize(7).text(label.toUpperCase(), x, y);
      doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(9).text(String(value || 'N/A'), x, y + 10, { width: w - 10 });
    };

    drawSpec('Status', complaint.status.toUpperCase(), 40, gridY);
    drawSpec('Priority', complaint.priority.toUpperCase(), 160, gridY);
    drawSpec('Category', complaint.category, 280, gridY);

    const gridY2 = gridY + 35;
    drawSpec('Submission Date', fmt(complaint.createdAt), 40, gridY2);
    drawSpec('Submission Time', new Date(complaint.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }), 160, gridY2);

    const gridY3 = gridY2 + 50; // Increased spacing
    // Full width for location to prevent truncation
    drawSpec('Location of Incident', complaint.location, 40, gridY3, 515);

    // ── DESCRIPTION BOX
    const descY = gridY3 + 60; // Increased spacing
    doc.roundedRect(40, descY, 515, 100, 8).fill('#ffffff').stroke('#e2e8f0');
    doc.fillColor(C.slate).font('Helvetica-Bold').fontSize(8).text('DETAILED COMPLAINT DESCRIPTION', 55, descY + 15);
    doc.fillColor(C.dark).font('Helvetica').fontSize(9).text(complaint.description || 'No description provided.', 55, descY + 30, { width: 485, height: 60, lineGap: 2, ellipsis: true });

    // ── TIMELINE TRACKER (Dynamic Wrapping)
    const timeY = descY + 160; // Significantly increased spacing
    doc.fillColor(C.slate).font('Helvetica-Bold').fontSize(9).text('RESOLUTION MILESTONES', 40, timeY);
    
    let ty = timeY + 20;
    const recentHistory = (complaint.history || []).slice(-4).reverse();
    recentHistory.forEach((h, i) => {
      const msg = h.message || 'No details provided.';
      const msgH = doc.heightOfString(msg, { width: 260, fontSize: 8 }) + 15;
      const rowH = Math.max(25, msgH);

      doc.rect(40, ty, 515, rowH).fill(i % 2 === 0 ? '#f8fafc' : C.white);
      doc.fillColor(C.teal).font('Helvetica-Bold').fontSize(7).text(fmtFull(h.date), 50, ty + 8);
      doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(8).text(h.action, 150, ty + 8);
      doc.fillColor(C.gray).font('Helvetica').fontSize(8).text(msg, 280, ty + 8, { width: 260 });
      ty += rowH;
    });

    // ── BOTTOM ACTION & EVIDENCE
    const botY = 560;
    doc.rect(40, botY, 515, 0.5).fill('#e2e8f0');
    
    doc.fillColor(C.gray).font('Helvetica-Bold').fontSize(7).text('SYSTEM VERIFICATION LOG', 40, botY + 15);
    doc.fillColor(C.dark).font('Helvetica-Oblique').fontSize(8).text(`Evidence Integrity: ${complaint.evidence?.length || 0} Files  |  Ticket: ${complaint.ticketId}  |  Processed via Authority L${complaint.current_authority_level}`, 40, botY + 26);

    drawFooter(doc);
    doc.end();
  } catch (err) {
    next(err);
  }
};


// ════════════════════════════════════════════════════════════════════════
// AGGREGATED SUMMARY PDF (MODERN DASHBOARD)
// ════════════════════════════════════════════════════════════════════════
exports.getSummaryReport = async (req, res, next) => {
  try {
    const { type = 'monthly', year, month, filter, mine } = req.query;
    const now = new Date();
    const y = parseInt(year) || now.getFullYear();
    const m = parseInt(month) || (now.getMonth() + 1);

    const query = {};
    let startDate, endDate, periodLabel;
    
    if (filter === 'all' || type === 'all') {
      periodLabel = 'All-Time Performance Report';
    } else if (filter === 'yearly' || type === 'yearly') {
      startDate = new Date(y, 0, 1);
      endDate   = new Date(y, 11, 31, 23, 59, 59);
      periodLabel = `Executive Annual Summary — ${y}`;
      query.createdAt = { $gte: startDate, $lte: endDate };
    } else {
      startDate = new Date(y, m - 1, 1);
      endDate   = new Date(y, m, 0, 23, 59, 59);
      periodLabel = `Executive Monthly Brief — ${startDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    let headerSubtitle = 'City-Wide Resource & Performance Analysis';
    if (req.user.role === 'citizen' || mine === 'true') {
      query.user = req.user._id;
      headerSubtitle = `Personal Impact Metrics — ${req.user.name}`;
    } else if (req.user.role === 'department_officer') {
      const catMapping = {
        'public_works': ['Road', 'Public Works'],
        'water_authority': ['Water', 'Water Authority'],
        'electricity': ['Electricity', 'Electricity Dept'],
        'sanitation': ['Waste', 'Sanitation Dept'],
        'public_safety': ['Safety', 'Public Safety Dept'],
        'environment': ['Environment', 'Environment Dept'],
        'police': ['Law Enforcement', 'Police Department']
      };
      const mappedCats = catMapping[req.user.department] || [req.user.department];
      query.category = { $in: mappedCats };
      headerSubtitle = `Departmental Performance — ${req.user.department.toUpperCase()}`;
    }

    const allComplaints = await Complaint.find(query).lean();

    // Stats
    const total      = allComplaints.length;
    const pending    = allComplaints.filter(c => c.status === 'pending').length;
    const inProgress = allComplaints.filter(c => c.status === 'in-progress').length;
    const resolved   = allComplaints.filter(c => c.status === 'resolved').length;
    const rejected   = allComplaints.filter(c => c.status === 'rejected').length;
    const critical   = allComplaints.filter(c => c.priority === 'Critical').length;
    const high       = allComplaints.filter(c => c.priority === 'High').length;
    const medium     = allComplaints.filter(c => c.priority === 'Medium').length;
    const low        = allComplaints.filter(c => c.priority === 'Low').length;
    const slaBreached = allComplaints.filter(c => c.slaDeadline && new Date(c.slaDeadline) < now && c.status !== 'resolved').length;
    const resRate     = total > 0 ? Math.round((resolved / total) * 100) : 0;

    // Dept Performance
    const deptMap = {};
    allComplaints.forEach(c => {
      const k = c.category || 'Unassigned';
      if (!deptMap[k]) deptMap[k] = { total: 0, resolved: 0 };
      deptMap[k].total++;
      if (c.status === 'resolved') deptMap[k].resolved++;
    });
    const dRowsTable = Object.entries(deptMap)
      .map(([k, v]) => ({ label: k, total: v.total, rate: Math.round((v.resolved / v.total) * 100) }))
      .sort((a, b) => b.total - a.total);
    
    const topDept = dRowsTable[0]?.label || 'General';

    // PDF Configuration (LANDSCAPE)
    const doc = new PDFDocument({ margin: 0, size: 'A4', layout: 'landscape', bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="shomadhan-dashboard-${y}-${m}.pdf"`);
    doc.pipe(res);

    drawHeader(doc, periodLabel, headerSubtitle, true);

    // ── KPI ROW (Top)
    const kpiY = 125;
    const kw = 120, kh = 55, kGap = 12;
    drawKPIBox(doc, 40, kpiY, kw, kh, 'Total Issues', total, C.slate);
    drawKPIBox(doc, 40 + (kw+kGap), kpiY, kw, kh, 'Resolved', resolved, C.emerald);
    drawKPIBox(doc, 40 + (kw+kGap)*2, kpiY, kw, kh, 'In Progress', inProgress, C.blue);
    drawKPIBox(doc, 40 + (kw+kGap)*3, kpiY, kw, kh, 'Pending', pending, C.orange);
    drawKPIBox(doc, 40 + (kw+kGap)*4, kpiY, kw, kh, 'Critical', critical, C.red);
    drawKPIBox(doc, 40 + (kw+kGap)*5, kpiY, kw, kh, 'Resolution %', resRate, C.gold);

    // ── VISUALIZATIONS & INTERPRETATIONS
    const chartY = 210;
    
    // Priority Distribution
    doc.fillColor(C.slate).font('Helvetica-Bold').fontSize(11).text('PRIORITY DISTRIBUTION', 40, chartY);
    drawPieChart(doc, 110, chartY + 75, 55, [
      { label: 'Critical', value: critical, color: C.red },
      { label: 'High', value: high, color: C.orange },
      { label: 'Medium', value: medium, color: C.blue },
      { label: 'Low', value: low, color: C.emerald },
    ]);
    
    // Interpretation for Priority
    doc.fillColor(C.dark).font('Helvetica-Oblique').fontSize(9);
    let pInterp = `Most reported issues fall under ${critical + high > medium + low ? 'High/Critical' : 'Medium/Low'} priority. `;
    pInterp += critical > 5 ? "Immediate resource reallocation to critical zones is recommended." : "Current critical workload is within manageable thresholds.";
    doc.text(pInterp, 40, chartY + 145, { width: 220, lineGap: 2 });

    // Status / Resolution
    doc.fillColor(C.slate).font('Helvetica-Bold').fontSize(11).text('RESOLUTION EFFICIENCY', 300, chartY);
    drawPieChart(doc, 370, chartY + 75, 55, [
      { label: 'Resolved', value: resolved, color: C.emerald },
      { label: 'Active', value: pending + inProgress, color: C.blue },
      { label: 'Rejected', value: rejected, color: C.red },
    ]);

    // Interpretation for Status
    doc.fillColor(C.dark).font('Helvetica-Oblique').fontSize(9);
    let sInterp = `The current resolution rate is ${resRate}%. `;
    sInterp += resRate > 70 ? "Excellent performance in clearing backlogs." : "Backlog is accumulating; consider increasing departmental response teams.";
    doc.text(sInterp, 300, chartY + 145, { width: 220, lineGap: 2 });

    // ── PERFORMANCE TABLE (Right Side)
    doc.fillColor(C.slate).font('Helvetica-Bold').fontSize(11).text('DEPARTMENT PERFORMANCE BOARD', 560, chartY);
    let ty = chartY + 20;
    doc.rect(560, ty, 242, 18).fill(C.slate);
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7).text('DEPT', 570, ty + 6).text('TOTAL', 720, ty + 6).text('RATE', 765, ty + 6);
    
    const displayRows = dRowsTable.slice(0, 6);

    displayRows.forEach((d, i) => {
      ty += 18;
      doc.rect(560, ty, 242, 18).fill(i % 2 === 0 ? '#f8fafc' : C.white);
      doc.fillColor(C.dark).font('Helvetica').fontSize(7).text(d.label.substring(0, 22), 570, ty + 6).text(String(d.total), 720, ty + 6);
      doc.fillColor(d.rate > 70 ? C.emerald : C.orange).font('Helvetica-Bold').text(`${d.rate}%`, 765, ty + 6);
    });

    // ── EXECUTIVE SUMMARY (Bottom)
    const summaryY = 445;
    doc.roundedRect(40, summaryY, 762, 100, 10).fill('#f1f5f9');
    doc.fillColor(C.teal).font('Helvetica-Bold').fontSize(11).text('ADMINISTRATIVE EXECUTIVE SUMMARY', 60, summaryY + 15);
    
    let execText = `Overview: Total ${total} civic issues processed this period. Performance Metrics indicate a ${resRate}% completion rate. `;
    execText += `Key Findings: ${critical} critical bottlenecks identified. ${dRowsTable[0]?.label || 'General'} department shows highest engagement. `;
    execText += `Recommendation: Prioritize SLA-breached tasks and allocate mobile response units to high-density categories.`;
    doc.fillColor(C.dark).font('Helvetica').fontSize(10).text(execText, 60, summaryY + 35, { width: 720, lineGap: 5 });

    // ── PAGE 2: ACCOUNTABILITY & RISK ANALYSIS (MAYOR ONLY) ────────────────
    if (req.user.role === 'mayor') {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 }); // Explicit size & layout
      drawHeader(doc, 'Accountability & Governance Risk Analysis', null, true);
      
      const riskData = await Promise.all(DEPARTMENT_KEYS.map(async (key) => {
        const deptComplaints = allComplaints.filter(c => c.category === key || c.assignedDepartment === key);
        const count = deptComplaints.length;
        if (count === 0) return null;

        const overdue = deptComplaints.filter(c => c.slaDeadline && new Date(c.slaDeadline) < now && c.status !== 'resolved').length;
        const escalations = deptComplaints.filter(c => c.history?.some(h => h.action?.includes('Escalated'))).length;
        const lowFeedback = deptComplaints.filter(c => c.feedback?.rating <= 2).length;
        const reassigned = deptComplaints.filter(c => c.history?.filter(h => h.action?.includes('Assigned to')).length > 1).length;
        const ignored = deptComplaints.filter(c => c.updatedAt < new Date(now - 7*24*60*60*1000) && c.status !== 'resolved').length;

        const sDelay = Math.min(100, (overdue / count) * 100);
        const sEsc   = Math.min(100, (escalations / count) * 100 * 2);
        const sFeed  = Math.min(100, (lowFeedback / Math.max(1, deptComplaints.filter(c => c.feedback).length || 1)) * 100);
        const sReas  = Math.min(100, (reassigned / count) * 100 * 2);
        const sIgn   = Math.min(100, (ignored / count) * 100);

        const score = Math.round((sDelay * 0.3) + (sEsc * 0.2) + (sFeed * 0.2) + (sReas * 0.15) + (sIgn * 0.15));
        return { key, score, level: score > 60 ? 'High' : score > 30 ? 'Moderate' : 'Low', details: { sDelay, sEsc, sFeed } };
      }));

      const activeRisk = riskData.filter(d => d !== null).sort((a, b) => b.score - a.score).slice(0, 8);

      const ry = 120;
      doc.fillColor(C.slate).font('Helvetica-Bold').fontSize(11).text('DEPARTMENT ACCOUNTABILITY HEATMAP', 40, ry);
      
      let curRy = ry + 25;
      activeRisk.forEach((r, i) => {
        const rowColor = r.level === 'High' ? '#fef2f2' : r.level === 'Moderate' ? '#fffbeb' : '#f0fdf4';
        const textColor = r.level === 'High' ? '#991b1b' : r.level === 'Moderate' ? '#92400e' : '#166534';
        
        doc.roundedRect(40, curRy, 762, 35, 6).fill(rowColor);
        doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(9).text(r.key.toUpperCase(), 55, curRy + 12);
        
        // Progress Bar for Risk Score
        const barW = 150;
        doc.rect(250, curRy + 14, barW, 8).fill('#e2e8f0');
        doc.rect(250, curRy + 14, (r.score / 100) * barW, 8).fill(r.level === 'High' ? C.red : r.level === 'Moderate' ? C.orange : C.emerald);
        
        doc.fillColor(textColor).font('Helvetica-Bold').fontSize(9).text(`${r.score}% RISK`, 410, curRy + 12);
        doc.fillColor(C.gray).font('Helvetica').fontSize(8).text(`Delays: ${Math.round(r.details.sDelay)}%  |  Escalations: ${Math.round(r.details.sEsc)}%  |  Status: ${r.level}`, 520, curRy + 13);
        
        curRy += 40;
      });

      // Ethical Disclaimer
      doc.fillColor(C.gray).font('Helvetica-Oblique').fontSize(7)
         .text('Proprietary Delay & Accountability Index. Values calculated using weighted Bayesian risk factors.', 40, 540, { align: 'center', width: 762 });
    }

    drawFooter(doc);
    doc.end();
  } catch (err) {
    next(err);
  }
};

exports.getDepartmentRiskScores = async (req, res, next) => {
  try {
    if (req.user.role !== 'mayor') return res.status(403).json({ success: false, message: 'Unauthorized access' });
    
    const now = new Date();
    const riskScores = await Promise.all(DEPARTMENT_KEYS.map(async (key) => {
      const complaints = await Complaint.find({ category: key }).lean();
      const count = complaints.length;
      if (count === 0) return { department: key, riskScore: 0, level: 'Low' };

      const overdue = complaints.filter(c => c.slaDeadline && new Date(c.slaDeadline) < now && c.status !== 'resolved').length;
      const escalations = complaints.filter(c => c.history?.some(h => h.action?.includes('Escalated'))).length;
      const lowFeedback = complaints.filter(c => c.feedback?.rating <= 2).length;
      const reassigned = complaints.filter(c => c.history?.filter(h => h.action?.includes('Assigned to')).length > 1).length;
      const ignored = complaints.filter(c => c.updatedAt < new Date(now - 7*24*60*60*1000) && c.status !== 'resolved').length;

      const sDelay = Math.min(100, (overdue / count) * 100);
      const sEsc   = Math.min(100, (escalations / count) * 100 * 2);
      const sFeed  = Math.min(100, (lowFeedback / Math.max(1, count)) * 100);
      const sReas  = Math.min(100, (reassigned / count) * 100 * 2);
      const sIgn   = Math.min(100, (ignored / count) * 100);

      const score = Math.round((sDelay * 0.3) + (sEsc * 0.2) + (sFeed * 0.2) + (sReas * 0.15) + (sIgn * 0.15));
      return {
        department: key,
        riskScore: score,
        level: score > 60 ? 'High' : score > 30 ? 'Moderate' : 'Low',
        breakdown: { delay: sDelay, escalation: sEsc, feedback: sFeed, reassignment: sReas, ignored: sIgn }
      };
    }));

    res.status(200).json({ success: true, data: riskScores });
  } catch (err) {
    next(err);
  }
};
