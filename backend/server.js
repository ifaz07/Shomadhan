const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();
require('./config/passport'); // Register Google & Facebook strategies

const path = require('path');
const authRoutes = require('./routes/auth.routes');
const complaintRoutes = require('./routes/complaint.routes');
const servantRoutes = require('./routes/servant.routes');
const emergencyBroadcastRoutes = require('./routes/emergencyBroadcast.routes');
const resourceRoutes = require('./routes/resource.routes');
const { errorHandler } = require('./middleware/error.middleware');

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
app.use('/uploads/avatars', express.static(path.join(__dirname, 'uploads/avatars')));

// CORS — allow frontend origin
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Session — used only for the OAuth handshake, not for app auth (JWT handles that)
app.use(session({
  secret: process.env.SESSION_SECRET || 'oauth-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 10 * 60 * 1000 }, // 10 min, just long enough for OAuth dance
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting — prevent brute-force on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many requests. Try again later.' },
});

// ─── Routes ──────────────────────────────────────────────────────────
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/v1/servant', servantRoutes);
app.use('/api/v1/emergency-broadcast', emergencyBroadcastRoutes);
app.use('/api/v1/resources', resourceRoutes);

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
const PORT = process.env.PORT || 5001;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
