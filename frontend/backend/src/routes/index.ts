import { Router } from 'express';
import { register, login, me, updateProfile, verifyEmail, resendVerification } from '../controllers/authController';
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct, getCategories } from '../controllers/productController';
import { getCart, addToCart, updateCartItem, removeCartItem, clearCart } from '../controllers/cartController';
import { getWishlist, toggleWishlist } from '../controllers/wishlistController';
import { createOrder, getOrders, getOrder } from '../controllers/orderController';
import { processPayment, getPaymentMethods } from '../controllers/paymentController';
import { getDashboard, getAllOrders, updateOrderStatus, getAllUsers, getUserDetails, getAdminOrder, updateUser, deleteUser, getAllProducts, getContactMessages, markContactMessageRead, deleteContactMessage, replyToContactMessage } from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { sendContactMessage } from '../controllers/contactController';
import { upload } from '../config/upload';

const router = Router();

// Auth
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/verify-email', verifyEmail);
router.post('/auth/resend-verification', resendVerification);
router.get('/auth/me', authenticate, me);
router.patch('/auth/profile', authenticate, updateProfile);

// Contact
router.post('/contact', sendContactMessage);

// Products (public)
router.get('/products', getProducts);
router.get('/products/categories', getCategories);
router.get('/products/:slug', getProduct);

// Contact messages (admin)
router.get('/admin/contact-messages', authenticate, requireAdmin, getContactMessages);
router.patch('/admin/contact-messages/:id/read', authenticate, requireAdmin, markContactMessageRead);
router.delete('/admin/contact-messages/:id', authenticate, requireAdmin, deleteContactMessage);
router.post('/admin/contact-messages/:id/reply', authenticate, requireAdmin, replyToContactMessage);

// Products (admin)
router.post('/admin/products', authenticate, requireAdmin, upload.single('image'), createProduct);
router.patch('/admin/products/:id', authenticate, requireAdmin, upload.single('image'), updateProduct);
router.delete('/admin/products/:id', authenticate, requireAdmin, deleteProduct);

// Cart
router.get('/cart', authenticate, getCart);
router.post('/cart', authenticate, addToCart);
router.patch('/cart/:id', authenticate, updateCartItem);
router.delete('/cart/:id', authenticate, removeCartItem);
router.delete('/cart', authenticate, clearCart);

// Wishlist
router.get('/wishlist', authenticate, getWishlist);
router.post('/wishlist/:id', authenticate, toggleWishlist);

// Orders
router.post('/orders', authenticate, createOrder);
router.get('/orders', authenticate, getOrders);
router.get('/orders/:id', authenticate, getOrder);

// Payment
router.get('/payment/methods', getPaymentMethods);
router.post('/payment/process', authenticate, processPayment);

// Admin
router.get('/admin/dashboard', authenticate, requireAdmin, getDashboard);
router.get('/admin/orders', authenticate, requireAdmin, getAllOrders);
router.get('/admin/orders/:id', authenticate, requireAdmin, getAdminOrder);
router.patch('/admin/orders/:id', authenticate, requireAdmin, updateOrderStatus);
router.get('/admin/users', authenticate, requireAdmin, getAllUsers);
router.get('/admin/users/:id', authenticate, requireAdmin, getUserDetails);
router.patch('/admin/users/:id', authenticate, requireAdmin, updateUser);
router.delete('/admin/users/:id', authenticate, requireAdmin, deleteUser);
router.get('/admin/products/all', authenticate, requireAdmin, getAllProducts);

export default router;
