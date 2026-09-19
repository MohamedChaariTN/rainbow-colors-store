import * as SecureStore from 'expo-secure-store';

export const API_BASE = 'https://rainbow-colors-store.onrender.com/api';
export const WEB_BASE = API_BASE.replace(/\/api$/, '');

export type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  profileImage?: string | null;
  address?: string | null;
  city?: string | null;
  role: string;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  color: string;
  _count?: { products: number };
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  oldPrice?: number | null;
  stock: number;
  stockStatus: string;
  image: string;
  images: string;
  features: string;
  badge?: string | null;
  categoryId: number;
  category?: Category;
};

export type CartItem = {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  product: Product;
};

export type Cart = {
  id?: number;
  items: CartItem[];
};

export type OrderItem = {
  id: number;
  productId: number;
  name: string;
  price: number;
  quantity: number;
  product?: Product;
};

export type Order = {
  id: number;
  orderNumber: string;
  userId: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  governorate: string;
  postalCode?: string | null;
  notes?: string | null;
  createdAt: string;
  items: OrderItem[];
};

export type PaymentMethod = {
  id: string;
  name: string;
  icon: string;
  description: string;
};

export function assetUrl(path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return WEB_BASE + (path.startsWith('/') ? path : '/' + path);
}

export function parseJsonArray<T = string>(value?: string | null): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function getToken() {
  return SecureStore.getItemAsync('rc_token');
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const authToken = token ?? await getToken();
  const headers = new Headers(options.headers as HeadersInit | undefined);
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  if (authToken) headers.set('Authorization', 'Bearer ' + authToken);

  const response = await fetch(API_BASE + path, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Une erreur est survenue.');
  }
  return data as T;
}

export const api = {
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  register: (body: { email: string; password: string; firstName: string; lastName: string; phone?: string }) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  me: (token: string) => request<{ user: User }>('/auth/me', {}, token),

  updateProfile: (body: Partial<User>, token: string) =>
    request<{ user: User }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, token),

  requestPasswordReset: (email: string) =>
    request<{ success: boolean }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (body: { email: string; code: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  deleteAccount: (password: string, token: string) =>
    request<{ success: boolean }>('/auth/account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }, token),

  products: (params: { search?: string; category?: string; page?: number; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.category) q.set('category', params.category);
    q.set('page', String(params.page ?? 1));
    q.set('limit', String(params.limit ?? 24));
    return request<{ products: Product[]; total: number; pages: number }>('/products?' + q.toString());
  },

  product: (slug: string) => request<Product>('/products/' + encodeURIComponent(slug)),

  categories: () => request<Category[]>('/products/categories'),

  cart: (token: string) => request<Cart>('/cart', {}, token),

  addToCart: (productId: number, quantity: number, token: string) =>
    request<Cart>('/cart', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    }, token),

  updateCartItem: (id: number, quantity: number, token: string) =>
    request<Cart>('/cart/' + id, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }, token),

  removeCartItem: (id: number, token: string) =>
    request<Cart>('/cart/' + id, { method: 'DELETE' }, token),

  wishlist: (token: string) => request<Product[]>('/wishlist', {}, token),

  toggleWishlist: (productId: number, token: string) =>
    request<{ wishlisted: boolean }>('/wishlist/' + productId, { method: 'POST' }, token),

  createOrder: (body: any, token: string) =>
    request<{ order: Order }>('/orders', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token),

  orders: (token: string) => request<Order[]>('/orders', {}, token),

  order: (id: number, token: string) => request<Order>('/orders/' + id, {}, token),

  paymentMethods: () => request<{ methods: PaymentMethod[] }>('/payment/methods'),

  processPayment: (body: { method: string; orderId: number }, token: string) =>
    request<{ success: boolean; paymentUrl?: string; paymentRef?: string; order: Order }>('/payment/process', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token),
};
