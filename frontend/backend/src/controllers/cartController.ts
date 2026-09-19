import { Response } from 'express';
import { prisma } from '../config/prisma';

function positiveInt(value: any) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function cartForUser(userId: number) {
  return prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true } } }
  });
}

export const getCart = async (req: any, res: Response) => {
  const cart = await cartForUser(req.user.id);
  res.json(cart || { items: [] });
};

export const addToCart = async (req: any, res: Response) => {
  try {
    const productId = positiveInt(req.body?.productId);
    const quantity = positiveInt(req.body?.quantity);

    if (!productId || !quantity) {
      return res.status(400).json({ error: 'Product and quantity must be valid positive integers.' });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true }
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    if (quantity > product.stock) {
      return res.status(400).json({ error: 'Not enough stock' });
    }

    const cart = await prisma.cart.upsert({
      where: { userId: req.user.id },
      update: {},
      create: { userId: req.user.id }
    });

    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } }
    });

    const nextQuantity = (existing?.quantity || 0) + quantity;
    if (nextQuantity > product.stock) {
      return res.status(400).json({ error: 'Not enough stock for the requested quantity.' });
    }

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: nextQuantity, price: product.price }
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity, price: product.price }
      });
    }

    res.json(await cartForUser(req.user.id));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const updateCartItem = async (req: any, res: Response) => {
  try {
    const itemId = positiveInt(req.params.id);
    const quantity = positiveInt(req.body?.quantity);

    if (!itemId || !quantity) {
      return res.status(400).json({ error: 'Cart item and quantity must be valid.' });
    }

    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId: req.user.id } },
      include: { product: true }
    });

    if (!item) return res.status(404).json({ error: 'Cart item not found' });
    if (!item.product.isActive) return res.status(400).json({ error: 'Product is no longer available.' });
    if (quantity > item.product.stock) return res.status(400).json({ error: 'Not enough stock' });

    await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity, price: item.product.price }
    });

    res.json(await cartForUser(req.user.id));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const removeCartItem = async (req: any, res: Response) => {
  try {
    const itemId = positiveInt(req.params.id);
    if (!itemId) return res.status(400).json({ error: 'Invalid cart item.' });

    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId: req.user.id } }
    });
    if (!item) return res.status(404).json({ error: 'Cart item not found' });

    await prisma.cartItem.delete({ where: { id: item.id } });
    res.json(await cartForUser(req.user.id));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const clearCart = async (req: any, res: Response) => {
  const cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
  if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  res.json({ message: 'Cart cleared' });
};
