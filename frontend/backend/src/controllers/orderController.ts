import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function generateOrderNumber() {
  return 'RC-' + Date.now().toString(36).toUpperCase();
}

const orderSchema = z.object({
  items: z.array(z.object({
    productId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive().max(100),
  })).min(1).max(100),
  paymentMethod: z.enum(['cod', 'card', 'edinar']),
  firstName: z.string().min(2).max(80),
  lastName: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().min(6).max(40),
  address: z.string().min(3).max(300),
  city: z.string().min(2).max(100),
  governorate: z.string().min(2).max(100),
  postalCode: z.string().max(20).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const createOrder = async (req: any, res: Response) => {
  try {
    const data = orderSchema.parse(req.body);
    const uniqueProductIds = [...new Set(data.items.map((item) => item.productId))];

    const products = await prisma.product.findMany({
      where: { id: { in: uniqueProductIds }, isActive: true }
    });
    const byId = new Map(products.map((product) => [product.id, product]));

    const normalizedItems = data.items.map((item) => {
      const product = byId.get(item.productId);
      if (!product) throw new Error('Un produit demandé est indisponible.');
      if (product.stock < item.quantity) {
        throw new Error('Stock insuffisant pour ' + product.name + '.');
      }
      return {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity
      };
    });

    const subtotal = normalizedItems.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0
    );
    const deliveryFee = subtotal > 200 ? 0 : 7;
    const tax = subtotal * 0.19;
    const total = subtotal + deliveryFee + tax;

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: req.user.id,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          paymentMethod: data.paymentMethod,
          subtotal,
          shipping: deliveryFee,
          tax,
          total,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          governorate: data.governorate,
          postalCode: data.postalCode || null,
          notes: data.notes || null,
          items: {
            create: normalizedItems
          }
        },
        include: { items: true }
      });

      if (data.paymentMethod === 'cod') {
        for (const item of normalizedItems) {
          const updated = await tx.product.updateMany({
            where: { id: item.productId, stock: { gte: item.quantity }, isActive: true },
            data: { stock: { decrement: item.quantity } }
          });
          if (updated.count !== 1) {
            throw new Error('Le stock a changé. Veuillez vérifier votre panier et réessayer.');
          }

          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true }
          });
          if (product) {
            const stockStatus = product.stock === 0
              ? 'OUT_OF_STOCK'
              : product.stock <= 5
                ? 'LOW_STOCK'
                : 'IN_STOCK';

            await tx.product.update({
              where: { id: item.productId },
              data: { stockStatus }
            });
          }
        }

        const cart = await tx.cart.findUnique({
          where: { userId: req.user.id },
          select: { id: true }
        });
        if (cart) {
          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        }
      }

      return created;
    });

    // Send confirmation email
    if (order.email && resend) {
      try {
        const itemsHtml = order.items
          .map((item: any) => {
            const itemTotal =
              Number(item.price) * Number(item.quantity);

            return (
              '<tr>' +
              '<td style="padding:10px;border-bottom:1px solid #eee;">' +
              item.name +
              '</td>' +
              '<td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">' +
              item.quantity +
              '</td>' +
              '<td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">' +
              itemTotal.toFixed(2) +
              ' TND</td>' +
              '</tr>'
            );
          })
          .join('');

        const emailHtml =
          '<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#333;">' +

          '<div style="padding:25px;text-align:center;border-bottom:4px solid #f5c400;background:#ffffff;">' +
          '<h1 style="margin:0;color:#1d4ed8;">Rainbow Colors</h1>' +
          '<p style="margin:8px 0 0;color:#666;">Peintures et matériaux de construction</p>' +
          '</div>' +

          '<div style="padding:30px;background:#f8fafc;">' +

          '<h2 style="color:#1d4ed8;">Merci pour votre commande !</h2>' +

          '<p>Nous avons bien reçu votre commande.</p>' +

          '<p>' +
          '<strong>Numéro de commande :</strong> ' +
          order.orderNumber +
          '</p>' +

          '<h3>Détails de la commande</h3>' +

          '<table style="width:100%;border-collapse:collapse;background:white;">' +

          '<thead>' +
          '<tr style="background:#f1f5f9;">' +
          '<th style="padding:10px;text-align:left;">Produit</th>' +
          '<th style="padding:10px;text-align:center;">Qté</th>' +
          '<th style="padding:10px;text-align:right;">Prix</th>' +
          '</tr>' +
          '</thead>' +

          '<tbody>' +
          itemsHtml +
          '</tbody>' +

          '</table>' +

          '<div style="margin-top:20px;background:white;padding:20px;border-radius:10px;">' +

          '<p>' +
          '<strong>Sous-total :</strong> ' +
          Number(order.subtotal).toFixed(2) +
          ' TND' +
          '</p>' +

          '<p>' +
          '<strong>Livraison :</strong> ' +
          Number(order.shipping).toFixed(2) +
          ' TND' +
          '</p>' +

          '<p>' +
          '<strong>TVA :</strong> ' +
          Number(order.tax).toFixed(2) +
          ' TND' +
          '</p>' +

          '<p style="font-size:20px;color:#1d4ed8;">' +
          '<strong>Total :</strong> ' +
          Number(order.total).toFixed(2) +
          ' TND' +
          '</p>' +

          '</div>' +

          '<p>' +
          '<strong>Mode de paiement :</strong> ' +
          order.paymentMethod +
          '</p>' +

          '<p>' +
          'Votre commande est actuellement ' +
          '<strong>en attente de traitement</strong>.' +
          '</p>' +

          '</div>' +

          '<div style="padding:20px;text-align:center;background:#ffffff;color:#777;font-size:13px;">' +
          '<p>Rainbow Colors — Sfax, Tunisie</p>' +
          '<p>+216 29 253 908</p>' +
          '<p>contact@rainbow-colors.tn</p>' +
          '</div>' +

          '</div>';

        const emailResult = await resend.emails.send({
          from: 'Rainbow Colors <onboarding@resend.dev>',
          to: order.email,
          subject:
            'Confirmation de votre commande ' +
            order.orderNumber,
          html: emailHtml
        });

        if (emailResult.error) {
          console.error(
            'Resend error:',
            emailResult.error
          );
        } else {
          console.log(
            'Confirmation email sent successfully:',
            emailResult.data?.id
          );
        }

      } catch (emailError) {
        console.error(
          'Email sending failed:',
          emailError
        );
      }
    }

    res.json({
      order
    });

  } catch (err: any) {
    res.status(400).json({
      error: err.message
    });
  }
};

export const getOrders = async (req: any, res: Response) => {
  const orders = await prisma.order.findMany({
    where: {
      userId: req.user.id
    },
    include: {
      items: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  res.json(orders);
};

export const getOrder = async (req: any, res: Response) => {
  const order = await prisma.order.findFirst({
    where: {
      id: parseInt(req.params.id),
      userId: req.user.id
    },
    include: {
      items: {
        include: {
          product: true
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
};
