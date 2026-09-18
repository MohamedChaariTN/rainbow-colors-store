import { Request, Response } from 'express';
import { Resend } from 'resend';
import { prisma } from '../config/prisma';

const resend = new Resend(process.env.RESEND_API_KEY);

const escapeHtml = (value: any) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const sendContactMessage = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        error: 'Nom, email et message sont obligatoires.'
      });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({
        error: 'Le service email n’est pas configuré.'
      });
    }

    const savedMessage = await prisma.contactMessage.create({
      data: {
        name: String(name).trim(),
        email: String(email).trim(),
        phone: phone ? String(phone).trim() : null,
        subject: String(subject || 'Message depuis le site').trim(),
        message: String(message).trim()
      }
    });

    const receiver =
      process.env.CONTACT_RECEIVER_EMAIL ||
      'admin@rainbow-colors.tn';

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone || 'Non renseigné');
    const safeSubject = escapeHtml(subject || 'Message depuis le site');
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

    const companyEmail = 'contact@rainbow-colors.tn';

    const companyHtml =
      '<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#172033;">' +
      '<div style="padding:28px 30px;background:#101a33;color:white;border-radius:14px 14px 0 0;">' +
      '<div style="font-size:27px;font-weight:900;">Rainbow <span style="color:#ffd400;">Colors</span></div>' +
      '<div style="margin-top:6px;color:#dbeafe;">Nouveau message reçu depuis le site</div>' +
      '</div>' +
      '<div style="padding:30px;background:#f8fafc;">' +
      '<h2 style="margin-top:0;color:#1556a6;">Nouveau message de contact</h2>' +
      '<div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">' +
      '<p><strong>Nom :</strong> ' + safeName + '</p>' +
      '<p><strong>Email :</strong> ' + safeEmail + '</p>' +
      '<p><strong>Téléphone :</strong> ' + safePhone + '</p>' +
      '<p><strong>Sujet :</strong> ' + safeSubject + '</p>' +
      '<div style="margin-top:20px;padding:18px;background:#f1f5f9;border-radius:10px;line-height:1.7;">' +
      '<strong>Message :</strong><br>' + safeMessage +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div style="padding:18px;text-align:center;color:#64748b;font-size:12px;">' +
      'Rainbow Colors — Sfax, Tunisie · +216 29 253 908' +
      '</div></div>';

    const customerHtml =
      '<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#172033;">' +
      '<div style="padding:28px 30px;background:#ffffff;border-bottom:4px solid #1556a6;">' +
      '<div style="font-size:27px;font-weight:900;color:#1556a6;">Rainbow <span style="color:#7c3aed;">Colors</span></div>' +
      '<div style="margin-top:6px;color:#64748b;">Peintures et matériaux de construction</div>' +
      '</div>' +
      '<div style="padding:32px;background:#f8fafc;">' +
      '<h2 style="margin-top:0;color:#1556a6;">Votre message a bien été envoyé</h2>' +
      '<p>Bonjour ' + safeName + ',</p>' +
      '<p>Nous confirmons la réception de votre message envoyé depuis le site <strong>Rainbow Colors</strong>.</p>' +
      '<div style="margin:22px 0;padding:18px;background:white;border:1px solid #dbe5ef;border-radius:12px;">' +
      '<p style="margin:0 0 8px;"><strong>Sujet :</strong> ' + safeSubject + '</p>' +
      '<p style="margin:0;color:#64748b;">Notre équipe va consulter votre demande et vous répondre à l’adresse <strong>' + safeEmail + '</strong>.</p>' +
      '</div>' +
      '<p>Merci pour votre confiance et votre intérêt pour Rainbow Colors.</p>' +
      '</div>' +
      '<div style="padding:22px;text-align:center;background:white;color:#64748b;font-size:12px;">' +
      '<strong style="color:#1556a6;">Rainbow Colors</strong><br>' +
      'Sfax, Tunisie · +216 29 253 908<br>' +
      companyEmail +
      '</div></div>';

    const adminEmail = await resend.emails.send({
      from: 'Rainbow Colors <onboarding@resend.dev>',
      to: receiver,
      replyTo: email,
      subject: 'Nouveau message Contact — ' + (subject || 'Rainbow Colors'),
      html: companyHtml
    });

    if (adminEmail.error) {
      console.error('Contact admin email error:', adminEmail.error);
    }

    const customerEmail = await resend.emails.send({
      from: 'Rainbow Colors <onboarding@resend.dev>',
      to: email,
      subject: 'Confirmation de réception de votre message — Rainbow Colors',
      html: customerHtml
    });

    if (customerEmail.error) {
      console.error('Contact customer confirmation error:', customerEmail.error);
    }

    res.json({
      success: true,
      confirmationSent: !customerEmail.error,
      companyEmailSent: !adminEmail.error,
      messageId: savedMessage.id
    });
  } catch (err: any) {
    console.error('Contact message error:', err);
    res.status(500).json({
      error: 'Une erreur est survenue lors de l’envoi du message.'
    });
  }
};
