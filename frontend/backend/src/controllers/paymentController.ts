import { Response } from 'express';
import { prisma } from '../config/prisma';

const KONNECT_API_URL = process.env.KONNECT_API_URL || 'https://api.sandbox.konnect.network/api/v2';

async function konnectRequest(path: string, init: RequestInit = {}) {
  const apiKey = process.env.KONNECT_API_KEY;
  if (!apiKey) throw new Error('Le paiement par carte n’est pas encore configuré.');

  const response = await fetch(KONNECT_API_URL + path, {
    ...init,
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });

  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'Erreur du service de paiement.');
  }

  return data;
}

async function markOrderPaid(orderId: number, payment: any) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true }
  });

  if (!order) return null;
  if (order.paymentStatus === 'PAID') return order;

  const expectedMillimes = Math.round(Number(order.total) * 1000);
  const receivedAmount = Number(payment?.amount ?? payment?.reachedAmount ?? 0);

  if (receivedAmount > 0 && receivedAmount !== expectedMillimes) {
    throw new Error('Le montant du paiement ne correspond pas au montant de la commande.');
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
    include: { items: true }
  });

  for (const item of updated.items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product) continue;

    const newStock = Math.max(0, product.stock - Number(item.quantity));
    const newStatus = newStock === 0
      ? 'OUT_OF_STOCK'
      : newStock <= 5
        ? 'LOW_STOCK'
        : 'IN_STOCK';

    await prisma.product.update({
      where: { id: product.id },
      data: { stock: newStock, stockStatus: newStatus }
    });
  }

  const cart = await prisma.cart.findUnique({ where: { userId: updated.userId } });
  if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  return updated;
}

export const processPayment = async (req: any, res: Response) => {
  try {
    const { method, orderId } = req.body;

    const order = await prisma.order.findFirst({
      where: { id: Number(orderId), userId: req.user.id },
      include: { items: true }
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (method === 'cod') {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'PENDING', status: 'CONFIRMED' }
      });

      return res.json({
        success: true,
        message: 'Commande confirmée - Paiement à la livraison',
        order
      });
    }

    if (method === 'card' || method === 'edinar') {
      const walletId = process.env.KONNECT_WALLET_ID;
      if (!walletId) throw new Error('Le portefeuille Konnect n’est pas encore configuré.');

      const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;

      const payment = await konnectRequest('/payments/init-payment', {
        method: 'POST',
        body: JSON.stringify({
          receiverWalletId: walletId,
          token: 'TND',
          amount: Math.round(Number(order.total) * 1000),
          type: 'immediate',
          description: `Commande ${order.orderNumber}`,
          acceptedPaymentMethods: method === 'card' ? ['bank_card'] : ['e-DINAR'],
          lifespan: 15,
          checkoutForm: false,
          addPaymentFeesToAmount: false,
          firstName: order.firstName,
          lastName: order.lastName,
          phoneNumber: order.phone,
          email: order.email,
          orderId: String(order.id),
          webhook: `${baseUrl}/api/payment/konnect/webhook`,
          theme: 'light'
        })
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'PENDING', status: 'PENDING' }
      });

      return res.json({
        success: true,
        paymentUrl: payment.payUrl,
        paymentRef: payment.paymentRef,
        order
      });
    }

    return res.status(400).json({ error: 'Invalid payment method' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const konnectWebhook = async (req: any, res: Response) => {
  try {
    const paymentRef = String(req.query?.payment_ref || '');
    if (!paymentRef) return res.status(400).send('payment_ref is required');

    const paymentData = await konnectRequest(`/payments/${encodeURIComponent(paymentRef)}`, { method: 'GET' });
    const payment = paymentData?.payment || paymentData;

    if (payment?.status === 'completed') {
      const orderId = Number(payment?.orderId);
      if (orderId) await markOrderPaid(orderId, payment);
    }

    return res.status(200).send('OK');
  } catch (err) {
    console.error('Konnect webhook error:', err);
    return res.status(200).send('OK');
  }
};

export const getPaymentMethods = async (req: any, res: Response) => {
  res.json({
    methods: [
      { id: 'cod', name: 'Paiement à la livraison (COD)', icon: '💵', description: 'Payez en espèces à la réception de votre commande' },
      { id: 'card', name: 'Carte bancaire', icon: '💳', description: 'Visa / Mastercard via Konnect — paiement sécurisé 3-D Secure' },
      { id: 'edinar', name: 'E-Dinar', icon: '📮', description: 'Paiement E-Dinar via Konnect' }
    ]
  });
};
