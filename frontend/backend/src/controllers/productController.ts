import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { describeDbError, isRetryableDbError, withDbRetry } from '../utils/dbRetry';

function sendCatalogueError(res: Response, operation: string, err: unknown) {
  console.error(`${operation} failed:`, describeDbError(err));
  if (isRetryableDbError(err)) {
    res.set('Retry-After', '5');
    return res.status(503).json({
      error: 'Le catalogue est temporairement indisponible. Veuillez réessayer dans quelques instants.'
    });
  }
  return res.status(500).json({ error: 'Une erreur interne est survenue.' });
}

function uploadedImage(req: any): string | null {
  if (!req.file?.buffer) return null;
  return `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
}

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
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const searchTerm = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const pageRaw = Number.parseInt(String(req.query.page ?? '1'), 10);
    const limitRaw = Number.parseInt(String(req.query.limit ?? '20'), 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    if (category) {
      where.category = { slug: category };
    }

    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { slug: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { image: { contains: searchTerm, mode: 'insensitive' } },
        { category: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { category: { slug: { contains: searchTerm, mode: 'insensitive' } } },
      ];
    }

    const [products, total] = await withDbRetry(() => Promise.all([
      prisma.product.findMany({
        where,
        // Public catalogue payload intentionally excludes prices, discounts and stock quantities.
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          image: true,
          images: true,
          features: true,
          badge: true,
          categoryId: true,
          createdAt: true,
          category: {
            select: { id: true, name: true, slug: true, description: true, icon: true, color: true }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ]));

    res.json({
      products,
      total,
      pages: Math.ceil(total / limit),
      page,
      limit
    });
  } catch (err: unknown) {
    return sendCatalogueError(res, 'GET /api/products', err);
  }
};
export const getProduct = async (req: Request, res: Response) => {
  try {
    const product = await withDbRetry(() => prisma.product.findFirst({
      where: { slug: req.params.slug, isActive: true },
      // Public detail endpoint also returns catalogue fields only.
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        images: true,
        features: true,
        badge: true,
        categoryId: true,
        createdAt: true,
        category: {
          select: { id: true, name: true, slug: true, description: true, icon: true, color: true }
        }
      }
    }));
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err: unknown) {
    return sendCatalogueError(res, 'GET /api/products/:slug', err);
  }
};

export const createProduct = async (req: any, res: Response) => {
  try {
    const data = productSchema.parse(req.body);
    const image = uploadedImage(req) || '/images/placeholder.jpg';
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
    const image = uploadedImage(req);
    if (image) {
      updateData.image = image;
      updateData.images = JSON.stringify([image]);
    }
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

export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await withDbRetry(() => prisma.category.findMany({
      include: { _count: { select: { products: true } } }
    }));
    res.json(categories);
  } catch (err: unknown) {
    return sendCatalogueError(res, 'GET /api/products/categories', err);
  }
};
