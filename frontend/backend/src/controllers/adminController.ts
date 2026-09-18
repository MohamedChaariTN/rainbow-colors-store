import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED'
];

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const [
      totalProducts,
      totalOrders,
      totalUsers,
      totalRevenue,
      recentOrders,
      lowStock
    ] = await Promise.all([
      prisma.product.count(),

      prisma.order.count(),

      prisma.user.count({
        where: { role: 'CUSTOMER' }
      }),

      prisma.order.aggregate({
        _sum: { total: true },
        where: { paymentStatus: 'PAID' }
      }),

      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }),

      prisma.product.findMany({
        where: {
          stockStatus: {
            in: ['LOW_STOCK', 'OUT_OF_STOCK']
          }
        },
        take: 10
      })
    ]);

    res.json({
      stats: {
        totalProducts,
        totalOrders,
        totalUsers,
        totalRevenue: totalRevenue._sum.total || 0
      },
      recentOrders,
      lowStock
    });
  } catch (err: any) {
    res.status(500).json({
      error: err.message
    });
  }
};


// =========================
// ORDERS
// =========================

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(orders);
  } catch (err: any) {
    res.status(500).json({
      error: err.message
    });
  }
};


export const getAdminOrder = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        error: 'Invalid order ID'
      });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    res.json(order);
  } catch (err: any) {
    res.status(500).json({
      error: err.message
    });
  }
};


export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { status, paymentStatus } = req.body;

    if (Number.isNaN(id)) {
      return res.status(400).json({
        error: 'Invalid order ID'
      });
    }

    if (status && !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        error: 'Invalid order status'
      });
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(paymentStatus ? { paymentStatus } : {})
      },
      include: {
        items: true
      }
    });

    res.json(order);
  } catch (err: any) {
    res.status(400).json({
      error: err.message
    });
  }
};


// =========================
// CUSTOMERS
// =========================

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        city: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(users);
  } catch (err: any) {
    res.status(500).json({
      error: err.message
    });
  }
};

export const getUserDetails = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        city: true,
        role: true,
        createdAt: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            paymentMethod: true,
            subtotal: true,
            shipping: true,
            tax: true,
            total: true,
            address: true,
            city: true,
            governorate: true,
            postalCode: true,
            createdAt: true,
            items: {
              select: {
                id: true,
                name: true,
                price: true,
                quantity: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Client introuvable' });
    }

    res.json({ user, country: 'Tunisie' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        error: 'Invalid user ID'
      });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      role
    } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        error: 'First name, last name and email are required'
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        phone: phone || null,
        address: address || null,
        city: city || null,
        ...(role ? { role } : {})
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        city: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(user);
  } catch (err: any) {
    res.status(400).json({
      error: err.message
    });
  }
};


export const deleteUser = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        error: 'Invalid user ID'
      });
    }

    const orderCount = await prisma.order.count({
      where: { userId: id }
    });

    if (orderCount > 0) {
      return res.status(400).json({
        error:
          'Impossible de supprimer ce client car il possède déjà des commandes.'
      });
    }

    await prisma.$transaction(async tx => {
      await tx.review.deleteMany({
        where: { userId: id }
      });

      await tx.wishlist.deleteMany({
        where: { userId: id }
      });

      const cart = await tx.cart.findUnique({
        where: { userId: id }
      });

      if (cart) {
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id }
        });

        await tx.cart.delete({
          where: { id: cart.id }
        });
      }

      await tx.user.delete({
        where: { id }
      });
    });

    res.json({
      success: true
    });
  } catch (err: any) {
    res.status(400).json({
      error: err.message
    });
  }
};


// =========================
// PRODUCTS
// =========================

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(products);
  } catch (err: any) {
    res.status(500).json({
      error: err.message
    });
  }
};


// =========================
// CATEGORIES
// =========================

export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(categories);
  } catch (err: any) {
    res.status(500).json({
      error: err.message
    });
  }
};


export const createCategory = async (req: Request, res: Response) => {
  try {
    const {
      name,
      slug,
      description,
      icon,
      color
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        error: 'Name and slug are required'
      });
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: description || null,
        icon: icon || null,
        color: color || '#2563eb'
      }
    });

    res.status(201).json(category);
  } catch (err: any) {
    res.status(400).json({
      error: err.message
    });
  }
};


export const updateCategory = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        error: 'Invalid category ID'
      });
    }

    const {
      name,
      slug,
      description,
      icon,
      color
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        error: 'Name and slug are required'
      });
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        description: description || null,
        icon: icon || null,
        color: color || '#2563eb'
      }
    });

    res.json(category);
  } catch (err: any) {
    res.status(400).json({
      error: err.message
    });
  }
};


export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        error: 'Invalid category ID'
      });
    }

    const productCount = await prisma.product.count({
      where: {
        categoryId: id
      }
    });

    if (productCount > 0) {
      return res.status(400).json({
        error:
          'Impossible de supprimer cette catégorie car elle contient encore des produits.'
      });
    }

    await prisma.category.delete({
      where: { id }
    });

    res.json({
      success: true
    });
  } catch (err: any) {
    res.status(400).json({
      error: err.message
    });
  }
};
