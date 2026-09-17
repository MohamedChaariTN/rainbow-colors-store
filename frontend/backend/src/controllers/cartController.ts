import { Response } from 'express';
import { prisma } from '../config/prisma';

export const getCart = async (req: any, res: Response) => {
  const cart = await prisma.cart.findUnique({
    where: { userId: req.user.id },
    include: { items: { include: { product: true } } }
  });
  res.json(cart || { items: [] });
};

export const addToCart = async (req: any, res: Response) => {
  try {
    const { productId, quantity } = req.body;
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stock < quantity) return res.status(400).json({ error: 'Not enough stock' });

    let cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (!cart) cart = await prisma.cart.create({ data: { userId: req.user.id } });

    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } }
    });

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity }
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity, price: product.price }
      });
    }

    const updated = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: { items: { include: { product: true } } }
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const updateCartItem = async (req: any, res: Response) => {
  try {
    const { quantity } = req.body;
    await prisma.cartItem.update({
      where: { id: parseInt(req.params.id) },
      data: { quantity: Math.max(1, quantity) }
    });
    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: { items: { include: { product: true } } }
    });
    res.json(cart);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const removeCartItem = async (req: any, res: Response) => {
  try {
    await prisma.cartItem.delete({ where: { id: parseInt(req.params.id) } });
    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: { items: { include: { product: true } } }
    });
    res.json(cart);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const clearCart = async (req: any, res: Response) => {
  const cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
  if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  res.json({ message: 'Cart cleared' });
};
