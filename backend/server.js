const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('./config/passport');

const authRoutes = require('./routes/auth.routes');
const complaintRoutes = require('./routes/complaint.routes');
const servantRoutes = require('./routes/servant.routes');
const notificationRoutes = require('./routes/notification.routes');
const adminRoutes = require('./routes/admin.routes');
const mayorRoutes = require('./routes/mayor.routes');
const volunteerRoutes = require('./routes/volunteer.routes');
const emergencyBroadcastRoutes = require('./routes/emergencyBroadcast.routes');
const { errorHandler } = require('./middleware/error.middleware');
const { initEscalationEngine } = require('./services/escalationService');
const reportRoutes = require('./routes/report.routes');
const aiRoutes = require('./routes/ai.routes');
const connectDB = require('./config/db');
const { getAllowedOrigins } = require('./config/runtimeUrls');
const { getUploadDir } = require('./utils/uploadPaths');

const app = express();
const allowedOrigins = getAllowedOrigins();
const isProduction = process.env.NODE_ENV === 'production';

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/uploads/evidence', express.static(getUploadDir('evidence')));
app.use('/uploads/verification', express.static(getUploadDir('verification')));
app.use('/uploads/avatars', express.static(getUploadDir('avatars')));
app.use('/uploads/volunteer', express.static(getUploadDir('volunteer')));

app.use(
  cors({
    origin: function(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'dev-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 10 * 60 * 1000,
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/v1/servant', servantRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/mayor', mayorRoutes);
app.use('/api/v1/volunteer-ads', volunteerRoutes);
app.use('/api/v1/emergency-broadcasts', emergencyBroadcastRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/ai', aiRoutes);

app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, message: 'Somadhan API is running' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    if (process.env.ENABLE_ESCALATION_CRON !== 'false') {
      initEscalationEngine();
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
