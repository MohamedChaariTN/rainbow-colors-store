import { Response } from 'express';
import { prisma } from '../config/prisma';

// Simulate Tunisian payment gateway
export const processPayment = async (req: any, res: Response) => {
  try {
    const { method, orderId, cardData } = req.body;
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (method === 'cod') {
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'PENDING', status: 'CONFIRMED' }
      });
      return res.json({ success: true, message: 'Commande confirmée - Paiement à la livraison', order });
    }

    if (method === 'card') {
      // Simulate Tunisian bank card processing
      // In production, integrate with SMT (Société Monétique Tunisie) or local bank API
      const simulated = simulateCardPayment(cardData, order.total);
      if (simulated.success) {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'PAID', status: 'CONFIRMED' }
        });
        return res.json({ success: true, message: 'Paiement par carte accepté', transactionId: simulated.transactionId, order });
      }
      return res.status(400).json({ success: false, error: 'Paiement refusé. Vérifiez vos informations bancaires.' });
    }

    if (method === 'edinar') {
      // Simulate E-Dinar (La Poste Tunisienne)
      const simulated = simulateEdinarPayment(cardData, order.total);
      if (simulated.success) {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'PAID', status: 'CONFIRMED' }
        });
        return res.json({ success: true, message: 'Paiement E-Dinar accepté', transactionId: simulated.transactionId, order });
      }
      return res.status(400).json({ success: false, error: 'Paiement E-Dinar refusé.' });
    }

    res.status(400).json({ error: 'Invalid payment method' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

function simulateCardPayment(cardData: any, amount: number) {
  // Simulate: accept if card number is 16 digits and not declined test card
  const isTestDecline = cardData?.number === '4000000000000002';
  if (isTestDecline) return { success: false };
  if (cardData?.number?.length >= 15) {
    return { success: true, transactionId: 'TN-CARD-' + Date.now() };
  }
  return { success: false };
}

function simulateEdinarPayment(cardData: any, amount: number) {
  // Simulate E-Dinar: accept if card starts with 6273 (E-Dinar prefix)
  if (cardData?.number?.startsWith('6273')) {
    return { success: true, transactionId: 'TN-EDINAR-' + Date.now() };
  }
  // Also accept for demo
  if (cardData?.number?.length >= 10) {
    return { success: true, transactionId: 'TN-EDINAR-' + Date.now() };
  }
  return { success: false };
}

export const getPaymentMethods = async (req: any, res: Response) => {
  res.json({
    methods: [
      { id: 'cod', name: 'Paiement à la livraison (COD)', icon: '💵', description: 'Payez en espèces à la réception de votre commande' },
      { id: 'card', name: 'Carte Bancaire Tunisienne', icon: '💳', description: 'Visa / Mastercard émises par les banques tunisiennes' },
      { id: 'edinar', name: 'E-Dinar (La Poste)', icon: '📮', description: 'Carte E-Dinar de La Poste Tunisienne' },
    ]
  });
};
