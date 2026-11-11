import { Router } from 'express';
import { login, me } from '../controllers/authController';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories
} from '../controllers/productController';
import {
  getDashboard,
  getAllProducts,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getContactMessages,
  markContactMessageRead,
  deleteContactMessage,
  replyToContactMessage
} from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { sendContactMessage } from '../controllers/contactController';
import { upload } from '../config/upload';
import { prisma } from '../config/prisma';
import { describeDbError, withDbRetry } from '../utils/dbRetry';

const router = Router();

// ======================================================
// HEALTH
// ======================================================

router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'rainbow-colors-api',
    mode: 'catalogue-only'
  });
});

router.get('/health/db', async (_req, res) => {
  try {
    await withDbRetry(() => prisma.$queryRaw`SELECT 1`, { attempts: 2, baseDelayMs: 250 });
    return res.json({ ok: true, database: 'up' });
  } catch (err) {
    console.error('Database health check failed:', describeDbError(err));
    return res.status(503).json({ ok: false, database: 'down' });
  }
});

// Temporary, non-sensitive deployment diagnostics. Never returns credentials.
router.get('/health/config', (_req, res) => {
  const raw = process.env.DATABASE_URL || '';
  let host: string | null = null;
  try {
    host = raw ? new URL(raw).host : null;
  } catch {
    host = 'unparsable';
  }
  res.json({
    databaseUrlConfigured: Boolean(raw),
    databaseHost: host,
    databaseLooksNeon: /neon\.tech/i.test(raw),
    databaseLooksRender: /render\.com/i.test(raw),
    jwtConfigured: Boolean(process.env.JWT_SECRET),
    frontendUrlConfigured: Boolean(process.env.FRONTEND_URL),
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    nodeEnv: process.env.NODE_ENV || null
  });
});

// ======================================================
// ADMIN AUTHENTICATION
// Only administrators can log in. Customer registration,
// profiles and password recovery are intentionally absent.
// ======================================================

router.post('/auth/login', login);
router.get('/auth/me', authenticate, requireAdmin, me);

// ======================================================
// PUBLIC CATALOGUE
// ======================================================

router.get('/products', getProducts);
router.get('/products/categories', getCategories);
router.get('/products/:slug', getProduct);

// ======================================================
// PUBLIC CONTACT FORM
// ======================================================

router.post('/contact', sendContactMessage);

// ======================================================
// ADMIN - CATALOGUE DASHBOARD
// ======================================================

router.get(
  '/admin/dashboard',
  authenticate,
  requireAdmin,
  getDashboard
);

// ======================================================
// ADMIN - PRODUCTS
// ======================================================

router.get(
  '/admin/products/all',
  authenticate,
  requireAdmin,
  getAllProducts
);

router.post(
  '/admin/products',
  authenticate,
  requireAdmin,
  upload.single('image'),
  createProduct
);

router.patch(
  '/admin/products/:id',
  authenticate,
  requireAdmin,
  upload.single('image'),
  updateProduct
);

router.delete(
  '/admin/products/:id',
  authenticate,
  requireAdmin,
  deleteProduct
);

// ======================================================
// ADMIN - CATEGORIES
// ======================================================

router.get(
  '/admin/categories',
  authenticate,
  requireAdmin,
  getAllCategories
);

router.post(
  '/admin/categories',
  authenticate,
  requireAdmin,
  createCategory
);

router.patch(
  '/admin/categories/:id',
  authenticate,
  requireAdmin,
  updateCategory
);

router.delete(
  '/admin/categories/:id',
  authenticate,
  requireAdmin,
  deleteCategory
);

// ======================================================
// ADMIN - CONTACT MESSAGES
// ======================================================

router.get(
  '/admin/contact-messages',
  authenticate,
  requireAdmin,
  getContactMessages
);

router.patch(
  '/admin/contact-messages/:id/read',
  authenticate,
  requireAdmin,
  markContactMessageRead
);

router.delete(
  '/admin/contact-messages/:id',
  authenticate,
  requireAdmin,
  deleteContactMessage
);

router.post(
  '/admin/contact-messages/:id/reply',
  authenticate,
  requireAdmin,
  replyToContactMessage
);

export default router;
