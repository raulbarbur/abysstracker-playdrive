import { createHmac, timingSafeEqual } from 'crypto';
import type { JwtPayload, AuthUser } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY_HOURS = 12;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set.');
}

// HS256 implementation using Node.js native crypto.
// No external JWT library — reduces bundle size and attack surface.

function base64UrlEncode(input: string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  const padded2 = pad ? padded + '='.repeat(4 - pad) : padded;
  return Buffer.from(padded2, 'base64').toString('utf8');
}

function sign(header: string, payload: string): string {
  return createHmac('sha256', JWT_SECRET!)
    .update(`${header}.${payload}`)
    .digest('base64url');
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Signs a new JWT token valid for 12 hours.
 * Embeds PWA preferences to avoid extra DB round-trip on client load (SRS RF-SG-029).
 */
export function signToken(user: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const header  = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now     = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    JSON.stringify({
      ...user,
      iat: now,
      exp: now + JWT_EXPIRY_HOURS * 3600,
    })
  );
  const signature = sign(header, payload);
  return `${header}.${payload}.${signature}`;
}

/**
 * Verifies a JWT token and returns the typed payload.
 * Throws a descriptive error if the token is invalid, expired, or tampered.
 */
export function verifyToken(token: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token structure.');
  }

  const [header, payload, signature] = parts;

  // Timing-safe signature comparison — prevents timing attacks.
  const expectedSignature = sign(header, payload);
  const sigBuffer         = Buffer.from(signature, 'base64url');
  const expectedBuffer    = Buffer.from(expectedSignature, 'base64url');

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid token signature.');
  }

  const decoded = JSON.parse(base64UrlDecode(payload)) as JwtPayload;
  const now     = Math.floor(Date.now() / 1000);

  if (decoded.exp < now) {
    throw new Error('Token expired.');
  }

  return decoded;
}

/**
 * Extracts the AuthUser subset from a verified JWT payload.
 * Use this in Route Handlers after calling verifyToken().
 */
export function toAuthUser(payload: JwtPayload): AuthUser {
  return {
    userId:             payload.userId,
    username:           payload.username,
    fullName:           payload.fullName,
    role:               payload.role,
    themePreference:    payload.themePreference,
    fontSizePreference: payload.fontSizePreference,
  };
}