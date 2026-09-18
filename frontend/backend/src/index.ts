import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import routes from './routes';
import { errorHandler } from './middleware/error';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

// IMPORTANT FOR RENDER / PROXY
app.set('trust proxy', 1);

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

app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
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
// STATIC FILES
// ======================================================

// Uploads
app.use(
  '/uploads',
  express.static(
    path.join(__dirname, '../uploads')
  )
);

// Main store
app.use(
  express.static(
    path.join(__dirname, '../../store')
  )
);

// Admin
app.use(
  '/admin',
  express.static(
    path.join(__dirname, '../../admin')
  )
);

// ======================================================
// API RATE LIMIT
// IMPORTANT:
// We apply rate limiting ONLY to /api
// so images, CSS, JS and HTML don't consume the limit.
// ======================================================

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  // Large enough for normal website usage
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

app.use(
  '/api',
  apiLimiter,
  routes
);

// ======================================================
// ADMIN FRONTEND
// ======================================================

app.get('/admin/*', (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      '../../admin/index.html'
    )
  );
});

// ======================================================
// MAIN FRONTEND
// ======================================================

app.get('*', (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      '../../store/index.html'
    )
  );
});

// ======================================================
// ERROR HANDLER
// ======================================================

app.use(errorHandler);

// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, () => {
  console.log(
    `🎨 Rainbow Colors Server running on http://localhost:${PORT}`
  );

  console.log(
    `🛒 Store: http://localhost:${PORT}`
  );

  console.log(
    `⚙️ Admin: http://localhost:${PORT}/admin`
  );
});
