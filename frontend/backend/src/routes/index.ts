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
