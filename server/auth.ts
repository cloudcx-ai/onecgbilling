import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import type { User, SafeUser } from '@shared/schema';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    pendingTwoFactor?: number;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateTwoFactorSecret(): string {
  return authenticator.generateSecret();
}

export function verifyTwoFactorToken(secret: string, token: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    return false;
  }
}

export async function generateQRCode(username: string, secret: string): Promise<string> {
  const otpauth = authenticator.keyuri(username, 'CloudCX Monitor', secret);
  return QRCode.toDataURL(otpauth);
}

export function toSafeUser(user: User): SafeUser {
  const { password, twoFactorSecret, ...safeUser } = user;
  return safeUser;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

export function createRequireAdmin(getUserById: (id: number) => Promise<User | undefined>) {
  return async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      const user = await getUserById(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin privileges required' });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
