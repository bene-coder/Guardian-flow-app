const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    // FIX 1: Lock CORS to your actual frontend URL in production.
    // '*' allows any origin — dangerous when you go live.
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

// ============ MIDDLEWARE ============
app.use(helmet());

// FIX 2: Restrict CORS properly — not just for Socket.io but for HTTP routes too.
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10kb' })); // FIX 3: Limit payload size — prevents large body attacks
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev')); // FIX 4: Use 'combined' log format in production for better log analysis

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' } // FIX 5: Return JSON error instead of plain text
});
app.use('/api/', limiter);

// FIX 6: Stricter rate limit specifically for panic alerts — prevent spam/abuse
const panicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 5,              // Max 5 panic triggers per minute per IP
  message: { error: 'Panic alert rate limit exceeded.' }
});
app.use('/api/alerts/panic', panicLimiter);

// ============ BASIC ROUTES ============
app.get('/', (req, res) => {
  res.json({
    name: 'GuardianFlow Backend',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      location: '/api/location',
      alerts: '/api/alerts',
      vehicles: '/api/vehicles',
      geofence: '/api/geofence'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    // FIX 7: Add memory usage to health check — useful for monitoring on Railway/Render
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    }
  });
});

// ============ IMPORT ROUTES ============
const locationRoutes = require('./routes/location');
const alertRoutes   = require('./routes/alerts');
const vehicleRoutes = require('./routes/vehicles');
const geofenceRoutes = require('./routes/geofence');

// ============ ATTACH API ROUTES ============
app.use('/api/location', locationRoutes);
app.use('/api/alerts',   alertRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/geofence', geofenceRoutes);

// ============ WEBSOCKET SETUP ============
const { initializeWebSocket } = require('./services/websocket');
initializeWebSocket(io);

// Make io available to routes
app.set('io', io);

// ============ INITIALIZE SERVICES ============
// FIX 8: Wrap service initialization in try/catch so a blockchain or
// analytics failure doesn't silently crash the whole server on startup.
const { initializeBlockchain } = require('./services/blockchain');
const { startMonitoring }      = require('./services/analytics');

try {
  initializeBlockchain();
  console.log('✅ Blockchain service initialized');
} catch (err) {
  console.error('⚠️  Blockchain service failed to initialize:', err.message);
  console.error('   Server will continue running without blockchain logging.');
}

try {
  startMonitoring();
  console.log('✅ Analytics monitoring started');
} catch (err) {
  console.error('⚠️  Analytics service failed to initialize:', err.message);
}

// ============ 404 HANDLER ============
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/vehicles',
      'POST /api/location',
      'POST /api/alerts/panic'
    ]
  });
});

// ============ GLOBAL ERROR HANDLER ============
// FIX 9: Log the full stack in development, hide it in production
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============ START SERVER ============
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🚀 GuardianFlow Backend Server      ║
║   Port: ${PORT}                        ║
║   Env:  ${(process.env.NODE_ENV || 'development').padEnd(29)}║
║   Status: RUNNING                      ║
╚════════════════════════════════════════╝
  `);
  console.log(`📍 Server:       http://localhost:${PORT}`);
  console.log(`📍 Health Check: http://localhost:${PORT}/api/health\n`);
});

// ============ GRACEFUL SHUTDOWN ============
// FIX 10: Added a forced exit timeout — prevents server hanging
// indefinitely if active connections don't close cleanly.
const shutdown = (signal) => {
  console.log(`\n${signal} received, closing server...`);
  server.close(() => {
    console.log('✅ Server closed cleanly');
    process.exit(0);
  });

  // Force exit after 10 seconds if server hasn't closed
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// FIX 11: Catch unhandled promise rejections — without this, a rejected
// promise in any async route can crash the entire server silently.
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  shutdown('uncaughtException');
});

module.exports = { app, io };