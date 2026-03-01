/**
 * server.js - Main entry point for the Clinical Intelligence Platform API
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const { sequelize } = require('./src/config/database');
const adminRoutes = require('./src/routes/admin.routes');
const doctorRoutes = require('./src/routes/doctor.routes');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security & Middleware ────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static file serving for uploaded files ───────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', adminRoutes);
app.use('/api', doctorRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start server ────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced');

    // Seed admin
    const { seedAdmin } = require('./src/seeders/adminSeeder');
    await seedAdmin();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
  }
};

start();
