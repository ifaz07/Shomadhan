const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const path = require('path');
const authRoutes = require('./routes/auth.routes');
const complaintRoutes = require('./routes/complaint.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const volunteerRoutes = require('./routes/volunteer.routes');
const announcementRoutes = require('./routes/announcement.routes');
const caseRoutes = require('./routes/case.routes');
const escalationRoutes = require('./routes/escalation.routes');
const reportRoutes = require('./routes/report.routes');
const { errorHandler } = require('./middleware/error.middleware');
const { processOverdueComplaints } = require('./services/escalationService');

const app = express();

// ─── Security & Parsing Middleware ───────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: false, // For serving images/videos
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static folder for uploaded evidence
app.use('/uploads/evidence', express.static(path.join(__dirname, 'uploads/evidence')));
app.use('/uploads/verification', express.static(path.join(__dirname, 'uploads/verification')));

// CORS — allow frontend origin
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting — prevent brute-force on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many requests. Try again later.' },
});

// ─── Routes ──────────────────────────────────────────────────────────
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/volunteers', volunteerRoutes);
app.use('/api/v1/announcements', announcementRoutes);
app.use('/api/v1/cases', caseRoutes);
app.use('/api/v1/escalations', escalationRoutes);
app.use('/api/v1/reports', reportRoutes);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, message: 'Somadhan API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Centralized error handler
app.use(errorHandler);

// ─── Database Connection & Server Start ──────────────────────────────
const PORT = process.env.PORT || 5003;

// Schedule automatic escalation check every 5 minutes
const ESCALATION_INTERVAL = process.env.ESCALATION_INTERVAL || 5 * 60 * 1000; // 5 minutes

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
    
    // Start automatic escalation job
    console.log(`[Server] Starting automatic escalation job (every ${ESCALATION_INTERVAL / 60000} minutes)`);
    
    // Run initial check
    setTimeout(async () => {
      try {
        await processOverdueComplaints();
      } catch (err) {
        console.error('[Server] Initial escalation check failed:', err.message);
      }
    }, 10000); // Wait 10 seconds after startup
    
    // Schedule periodic checks
    const escalationInterval = setInterval(async () => {
      try {
        await processOverdueComplaints();
      } catch (err) {
        console.error('[Server] Escalation job failed:', err.message);
      }
    }, ESCALATION_INTERVAL);
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('[Server] SIGTERM received, shutting down...');
      clearInterval(escalationInterval);
      server.close(() => {
        console.log('[Server] HTTP server closed');
        mongoose.connection.close(false, () => {
          console.log('[Server] MongoDB connection closed');
          process.exit(0);
        });
      });
    });
    
    process.on('SIGINT', () => {
      console.log('[Server] SIGINT received, shutting down...');
      clearInterval(escalationInterval);
      server.close(() => {
        console.log('[Server] HTTP server closed');
        mongoose.connection.close(false, () => {
          console.log('[Server] MongoDB connection closed');
          process.exit(0);
        });
      });
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
