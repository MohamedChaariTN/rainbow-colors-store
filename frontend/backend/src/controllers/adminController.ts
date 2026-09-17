import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const getDashboard = async (req: Request, res: Response) => {
  const [totalProducts, totalOrders, totalUsers, totalRevenue, recentOrders, lowStock] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: 'PAID' } }),
    prisma.order.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { items: true, user: { select: { firstName: true, lastName: true, email: true } } } }),
    prisma.product.findMany({ where: { stockStatus: { in: ['LOW_STOCK', 'OUT_OF_STOCK'] } }, take: 10 }),
  ]);

  res.json({
    stats: {
      totalProducts,
      totalOrders,
      totalUsers,
      totalRevenue: totalRevenue._sum.total || 0,
    },
    recentOrders,
    lowStock,
  });
};

export const getAllOrders = async (req: Request, res: Response) => {
  const orders = await prisma.order.findMany({
    include: { items: true, user: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json(orders);
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({
      where: { id: parseInt(req.params.id) },
      data: { status }
    });
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(users);
};

export const getAllProducts = async (req: Request, res: Response) => {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(products);
};
