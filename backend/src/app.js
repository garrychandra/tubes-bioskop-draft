require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const routes = require('./routes');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Global rate limiting (generous fallback; sensitive routes have their own stricter limiter)
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

// HTTP request logging
// In production use the 'combined' Apache format (standard for log aggregators)
// rather than 'dev' which was designed for local development readability.
app.use(morgan(isProduction ? 'combined' : 'dev'));

// Parsing
app.use(express.json());

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ─── Global Error Handler ────────────────────────────────────────────────────
// In production, never leak internal error details (stack traces, DB constraint
// names, file paths) to the client.  Only expose them in non-production envs
// where a developer is actively debugging.
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err.stack);
  const message = isProduction ? 'Internal Server Error' : (err.message || 'Internal Server Error');
  res.status(err.status || 500).json({ error: message });
});

module.exports = app;
