import { Response } from 'express';
import { prisma } from '../config/prisma';

function generateOrderNumber() {
  return 'RC-' + Date.now().toString(36).toUpperCase();
}

export const createOrder = async (req: any, res: Response) => {
  try {
    const { items, shipping, paymentMethod, ...address } = req.body;
    const subtotal = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
    const tax = subtotal * 0.19;
    const total = subtotal + shipping + tax;

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: req.user.id,
        status: 'PENDING',
        paymentStatus: paymentMethod === 'cod' ? 'PENDING' : 'PENDING',
        paymentMethod,
        subtotal,
        shipping,
        tax,
        total,
        ...address,
        items: {
          create: items.map((i: any) => ({
            productId: i.productId,
            name: i.name,
            price: i.price,
            quantity: i.quantity
          }))
        }
      },
      include: { items: true }
    });

    // Update stock
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (product) {
        const newStock = Math.max(0, product.stock - item.quantity);
        const newStatus = newStock === 0 ? 'OUT_OF_STOCK' : newStock <= 5 ? 'LOW_STOCK' : 'IN_STOCK';
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: newStock, stockStatus: newStatus }
        });
      }
    }

    // Clear cart
    const cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    res.json({ order });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getOrders = async (req: any, res: Response) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    include: { items: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(orders);
};

export const getOrder = async (req: any, res: Response) => {
  const order = await prisma.order.findFirst({
    where: { id: parseInt(req.params.id), userId: req.user.id },
    include: { items: { include: { product: true } } }
  });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
};
