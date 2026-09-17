import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';

const productSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string(),
  price: z.number().positive().or(z.string().transform(v => parseFloat(v))).pipe(z.number().positive()),
  oldPrice: z.number().positive().nullable().optional().or(z.string().transform(v => v ? parseFloat(v) : null)).optional(),
  stock: z.number().int().min(0).or(z.string().transform(v => parseInt(v))).pipe(z.number().int().min(0)),
  stockStatus: z.enum(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']),
  badge: z.string().nullable().optional(),
  categoryId: z.number().int().or(z.string().transform(v => parseInt(v))).pipe(z.number().int()),
  features: z.string().optional(),
  isActive: z.boolean().optional().or(z.string().transform(v => v === 'true')).optional(),
});

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { category, search, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { isActive: true };
    if (category) where.category = { slug: category };
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ]);

    res.json({ products, total, pages: Math.ceil(total / parseInt(limit as string)) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getProduct = async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: { category: true, reviews: { include: { user: { select: { firstName: true, lastName: true } } } } }
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createProduct = async (req: any, res: Response) => {
  try {
    const data = productSchema.parse(req.body);
    const image = req.file ? `/uploads/products/${req.file.filename}` : '/images/placeholder.jpg';
    const features = data.features ? (data.features.startsWith('[') ? data.features : JSON.stringify(data.features.split('\n').filter(f => f.trim()))) : '[]';
    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        price: data.price,
        oldPrice: data.oldPrice || null,
        stock: data.stock,
        stockStatus: data.stockStatus,
        badge: data.badge || null,
        categoryId: data.categoryId,
        features: features,
        image,
        images: JSON.stringify([image])
      }
    });
    res.json(product);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const updateProduct = async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const data = productSchema.partial().parse(req.body);
    const updateData: any = {
      ...(data.name && { name: data.name }),
      ...(data.slug && { slug: data.slug }),
      ...(data.description && { description: data.description }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.oldPrice !== undefined && { oldPrice: data.oldPrice }),
      ...(data.stock !== undefined && { stock: data.stock }),
      ...(data.stockStatus && { stockStatus: data.stockStatus }),
      ...(data.badge !== undefined && { badge: data.badge }),
      ...(data.categoryId && { categoryId: data.categoryId }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    };
    if (data.features) {
      updateData.features = data.features.startsWith('[') ? data.features : JSON.stringify(data.features.split('\n').filter(f => f.trim()));
    }
    if (req.file) updateData.image = `/uploads/products/${req.file.filename}`;
    const product = await prisma.product.update({ where: { id }, data: updateData });
    res.json(product);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteProduct = async (req: any, res: Response) => {
  try {
    await prisma.product.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Product deleted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getCategories = async (req: Request, res: Response) => {
  const categories = await prisma.category.findMany({ include: { _count: { select: { products: true } } } });
  res.json(categories);
};
