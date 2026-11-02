import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { Resend } from 'resend';

// =========================
// CATALOGUE DASHBOARD
// =========================

export const getDashboard = async (_req: Request, res: Response) => {
  try {
    const [
      totalProducts,
      totalCategories,
      unreadMessages,
      lowStockCount,
      recentProducts,
      lowStock
    ] = await Promise.all([
      prisma.product.count(),

      prisma.category.count(),

      prisma.contactMessage.count({
        where: { isRead: false }
      }),

      prisma.product.count({
        where: {
          stockStatus: {
            in: ['LOW_STOCK', 'OUT_OF_STOCK']
          }
        }
      }),

      prisma.product.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          category: {
            select: { name: true }
          }
        }
      }),

      prisma.product.findMany({
        where: {
          stockStatus: {
            in: ['LOW_STOCK', 'OUT_OF_STOCK']
          }
        },
        take: 10,
        orderBy: { stock: 'asc' },
        select: {
          id: true,
          name: true,
          stock: true,
          stockStatus: true
        }
      })
    ]);

    res.json({
      stats: {
        totalProducts,
        totalCategories,
        unreadMessages,
        lowStockCount
      },
      recentProducts,
      lowStock
    });
  } catch (err: any) {
    res.status(500).json({
      error: err.message
    });
  }
};

// =========================
// CONTACT MESSAGES
// =========================

export const getContactMessages = async (req: Request, res: Response) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const markContactMessageRead = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid message ID' });
    const message = await prisma.contactMessage.update({
      where: { id },
      data: { isRead: true }
    });
    res.json(message);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteContactMessage = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid message ID' });
    await prisma.contactMessage.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const replyToContactMessage = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { message } = req.body;
    if (Number.isNaN(id) || !message || !String(message).trim()) {
      return res.status(400).json({ error: 'Le message de réponse est obligatoire.' });
    }
    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: 'Le service email n’est pas configuré.' });
    }
    const contact = await prisma.contactMessage.findUnique({ where: { id } });
    if (!contact) return res.status(404).json({ error: 'Message introuvable.' });
    const resend = new Resend(process.env.RESEND_API_KEY);
    const safeMessage = String(message).trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;').replace(/\n/g, '<br>');
    const result = await resend.emails.send({
      from: 'Rainbow Colors <onboarding@resend.dev>',
      to: contact.email,
      subject: 'Re: ' + contact.subject,
      html: '<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#172033"><div style="padding:28px;background:#101a33;color:#fff;border-radius:14px 14px 0 0;font-size:27px;font-weight:900">Rainbow <span style="color:#ffd400">Colors</span></div><div style="padding:30px;background:#f8fafc"><h2 style="color:#1556a6">Réponse à votre message</h2><p>Bonjour ' + String(contact.name).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + ',</p><div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;line-height:1.7">' + safeMessage + '</div><p style="margin-top:24px">Cordialement,<br><strong>Rainbow Colors</strong><br>Sfax, Tunisie · +216 29 253 908</p></div></div>'
    });
    if (result.error) return res.status(500).json({ error: 'La réponse n’a pas pu être envoyée.' });
    await prisma.contactMessage.update({ where: { id }, data: { isRead: true } });
    res.json({ success: true });
  } catch (err: any) {
    console.error('Contact reply error:', err);
    res.status(500).json({ error: 'Une erreur est survenue lors de l’envoi.' });
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
