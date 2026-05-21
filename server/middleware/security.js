const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

function applySecurity(app) {
  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for dev — React handles this
    crossOriginEmbedderPolicy: false,
  }));

  // CORS — allow Vite dev server + Tailscale domains
  app.use(cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3001',
      /\.ts\.net$/,           // Tailscale domains
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  }));

  // Rate limiting — 200 requests per minute per IP
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please slow down.' },
  });
  app.use('/api/', limiter);
}

module.exports = { applySecurity };
