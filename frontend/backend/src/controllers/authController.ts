import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import crypto from 'crypto';
const nodemailer = require('nodemailer');
import { prisma } from '../config/prisma';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().optional(),
  profileImage: z.string().max(2800000).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const register = async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      if (existing.emailVerified) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé. Connectez-vous à votre compte.' });
      }

      // Allow a pending/unverified registration to be restarted with the new form data.
      const hashed = await bcrypt.hash(data.password, 12);
      const code = crypto.randomInt(100000, 1000000).toString();
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          email: data.email,
          password: hashed,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          profileImage: data.profileImage,
          verificationCode: code,
          verificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
          emailVerified: false
        }
      });

      try {
        await sendVerificationEmail(updated.email, updated.firstName, code);
      } catch (emailError: any) {
        const detail = emailError?.message ? ' ' + emailError.message : '';
        return res.status(503).json({ error: 'Impossible d’envoyer le code de vérification pour le moment.' + detail });
      }

      return res.json({ verificationRequired: true, email: updated.email });
    }

    const hashed = await bcrypt.hash(data.password, 12);
    const code = crypto.randomInt(100000, 1000000).toString();
    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashed,
        verificationCode: code,
        verificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        emailVerified: false
      }
    });

    try {
      await sendVerificationEmail(user.email, user.firstName, code);
    } catch (emailError: any) {
      // Do not leave a blocked, unverified account when the email provider fails.
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
      const detail = emailError?.message ? ' ' + emailError.message : '';
      return res.status(503).json({ error: 'Impossible d’envoyer le code de vérification pour le moment.' + detail });
    }

    res.json({ verificationRequired: true, email: user.email });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

async function sendVerificationEmail(email: string, firstName: string, code: string) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'rainbowcolors.store1@gmail.com';

  if (!apiKey) throw new Error('Le service email n’est pas configuré.');

  const safeFirstName = firstName.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const htmlContent = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#172033"><div style="padding:24px;background:#101a33;color:#fff;border-radius:14px 14px 0 0;font-size:26px;font-weight:900">Rainbow <span style="color:#ffd400">Colors</span></div><div style="padding:30px;background:#f8fafc"><h2>Vérification de votre email</h2><p>Bonjour ' + safeFirstName + ',</p><p>Voici votre code de vérification :</p><div style="font-size:36px;font-weight:900;letter-spacing:8px;text-align:center;background:#fff;border:1px solid #dbe3ef;border-radius:14px;padding:18px;margin:24px 0">' + code + '</div><p>Ce code est valable pendant 10 minutes.</p><p>Si vous n’avez pas demandé cette inscription, ignorez cet email.</p></div></div>';

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'Rainbow Colors', email: senderEmail },
      to: [{ email }],
      subject: 'Votre code de vérification — Rainbow Colors',
      htmlContent
    })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.message || result?.code || 'Impossible d’envoyer le code de vérification.');
  }
}

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    if (!email || !/^\d{6}$/.test(String(code || ''))) return res.status(400).json({ error: 'Code de vérification invalide.' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'Compte introuvable.' });
    if (user.emailVerified) return res.status(400).json({ error: 'Email déjà vérifié.' });
    if (!user.verificationCode || !user.verificationExpiresAt || user.verificationExpiresAt.getTime() < Date.now()) return res.status(400).json({ error: 'Le code a expiré. Demandez un nouveau code.' });
    if (user.verificationCode !== String(code)) return res.status(400).json({ error: 'Code de vérification incorrect.' });
    const updated = await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true, verificationCode: null, verificationExpiresAt: null } });
    const token = jwt.sign({ userId: updated.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.json({ token, user: { id: updated.id, email: updated.email, firstName: updated.firstName, lastName: updated.lastName, role: updated.role, profileImage: updated.profileImage } });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
};

export const resendVerification = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'Compte introuvable.' });
    if (user.emailVerified) return res.status(400).json({ error: 'Email déjà vérifié.' });
    const code = crypto.randomInt(100000, 1000000).toString();
    await prisma.user.update({ where: { id: user.id }, data: { verificationCode: code, verificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
    await sendVerificationEmail(user.email, user.firstName, code);
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
};

export const login = async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.emailVerified && user.verificationCode) return res.status(403).json({ error: 'Veuillez vérifier votre email avant de vous connecter.' });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, profileImage: user.profileImage } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const me = async (req: any, res: Response) => {
  res.json({ user: req.user });
};

export const updateProfile = async (req: any, res: Response) => {
  try {
    const { firstName, lastName, phone, address, city, profileImage } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { firstName, lastName, phone, address, city, profileImage }
    });
    res.json({ user });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
