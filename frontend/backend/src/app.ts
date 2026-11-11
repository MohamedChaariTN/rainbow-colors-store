import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import routes from './routes';
import { errorHandler } from './middleware/error';

dotenv.config();

const app = express();

// IMPORTANT FOR VERCEL / PROXY
app.set('trust proxy', 1);

// ======================================================
// CORS
// FRONTEND_URL may contain one or more comma-separated
// exact origins. No wildcard is used with credentials.
// ======================================================

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(origin => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

const isDevelopment = process.env.NODE_ENV === 'development';

app.use(
  cors({
    origin: (origin, callback) => {
      // Requests without an Origin header are same-origin, curl or server-to-server.
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/$/, '');

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // Only explicit development mode may use the permissive fallback.
      if (!allowedOrigins.length && isDevelopment) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true
  })
);

if (!isDevelopment && !allowedOrigins.length) {
  console.warn(
    'FRONTEND_URL is not configured. Cross-origin browser requests will be rejected.'
  );
}

// ======================================================
// SECURITY
// ======================================================

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: {
      policy: 'cross-origin'
    }
  })
);

// ======================================================
// BODY PARSER
// ======================================================

app.use(
  express.json({
    limit: '10mb'
  })
);

// ======================================================
// API RATE LIMIT
// Applied only to /api. Uploaded images are not limited.
// ======================================================

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  // Large enough for normal catalogue usage
  max: 5000,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    error: 'Too many requests, please try again later.'
  }
});

// ======================================================
// API
// ======================================================

// Vercel passes the full /api/... path to the catch-all function. If a
// rewrite or local proxy strips the prefix, restore it before routing.
if (process.env.VERCEL) {
  app.use((req, _res, next) => {
    if (req.url && !req.url.startsWith('/api')) {
      req.url = `/api${req.url}`;
    }
    next();
  });
}

app.use(
  '/api',
  apiLimiter,
  routes
);

// ======================================================
// INTENTIONALLY DISABLED FEATURES
// These prefixes return an explicit 404 so removed
// e-commerce endpoints cannot be reached by any method.
// ======================================================

const DISABLED_API_PREFIXES = [
  '/auth/register',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/profile',
  '/auth/account',
  '/cart',
  '/wishlist',
  '/orders',
  '/checkout',
  '/payment',
  '/admin/orders',
  '/admin/users',
  '/admin/customers'
];

app.use('/api', (req, res) => {
  const normalizedPath = `/${req.path
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase()}`;

  const isDisabled = DISABLED_API_PREFIXES.some(
    prefix =>
      normalizedPath === prefix ||
      normalizedPath.startsWith(`${prefix}/`)
  );

  if (isDisabled) {
    return res.status(404).json({
      error:
        'This feature is not available in the catalogue-only deployment.',
      code: 'FEATURE_DISABLED'
    });
  }

  return res.status(404).json({
    error: 'API endpoint not found.',
    code: 'NOT_FOUND'
  });
});

// ======================================================
// ROOT
// ======================================================

app.get('/', (_req, res) => {
  res.json({
    service: 'rainbow-colors-api',
    status: 'ok',
    mode: 'catalogue-only'
  });
});

// ======================================================
// NON-API 404
// This server does not serve the store or admin frontends.
// ======================================================

app.use((_req, res) => {
  res.status(404).json({
    error: 'Not found.',
    code: 'NOT_FOUND'
  });
});

// ======================================================
// ERROR HANDLER
// ======================================================

app.use(errorHandler);

export default app;
