import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: 'USER' | 'ADMIN';
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  } as SignOptions);
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  } as SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwt.accessSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as JwtPayload;
}

export interface EmailTokenPayload {
  sub: string; // user id
  email: string;
  purpose: 'verify-email' | 'reset-password';
}

export function signEmailToken(payload: EmailTokenPayload, expiresIn: string): string {
  return jwt.sign(payload, env.jwt.accessSecret, { expiresIn } as SignOptions);
}

export function verifyEmailToken(token: string): EmailTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as EmailTokenPayload;
}
