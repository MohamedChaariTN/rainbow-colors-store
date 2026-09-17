import { Response } from 'express';
import { prisma } from '../config/prisma';

export const getWishlist = async (req: any, res: Response) => {
  const items = await prisma.wishlist.findMany({
    where: { userId: req.user.id },
    include: { product: { include: { category: true } } }
  });
  res.json(items);
};

export const toggleWishlist = async (req: any, res: Response) => {
  try {
    const productId = parseInt(req.params.id);
    const existing = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId: req.user.id, productId } }
    });
    if (existing) {
      await prisma.wishlist.delete({ where: { id: existing.id } });
      res.json({ added: false });
    } else {
      await prisma.wishlist.create({ data: { userId: req.user.id, productId } });
      res.json({ added: true });
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
