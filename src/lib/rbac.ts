import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, toAuthUser } from './jwt';
import type { AuthUser } from '@/types';

const COOKIE_NAME = 'playdrive_token';

// ============================================================
// TOKEN EXTRACTION
// ============================================================

/**
 * Extracts the JWT string from the request cookie.
 * Returns null if the cookie is absent.
 */
function extractToken(req: NextRequest): string | null {
  return req.cookies.get(COOKIE_NAME)?.value ?? null;
}

// ============================================================
// GUARDS
// ============================================================

/**
 * Validates the JWT and returns the authenticated user.
 * Returns a 401 NextResponse if the token is missing or invalid.
 *
 * Usage in Route Handlers:
 *   const result = requireAuth(req);
 *   if (result instanceof NextResponse) return result;
 *   const user = result; // AuthUser
 */
export function requireAuth(req: NextRequest): AuthUser | NextResponse {
  const token = extractToken(req);

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'No autenticado.' },
      { status: 401 }
    );
  }

  try {
    const payload = verifyToken(token);
    return toAuthUser(payload);
  } catch {
    return NextResponse.json(
      { success: false, error: 'Sesión inválida o expirada.' },
      { status: 401 }
    );
  }
}

/**
 * Validates the JWT and enforces admin role.
 * Returns a 401 if unauthenticated, 403 if authenticated but not admin.
 *
 * Usage in Route Handlers:
 *   const result = requireAdmin(req);
 *   if (result instanceof NextResponse) return result;
 *   const user = result; // AuthUser with role = 'admin'
 */
export function requireAdmin(req: NextRequest): AuthUser | NextResponse {
  const authResult = requireAuth(req);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  if (authResult.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Acceso restringido a administradores.' },
      { status: 403 }
    );
  }

  return authResult;
}

// ============================================================
// COOKIE HELPERS
// ============================================================

const COOKIE_MAX_AGE = 12 * 60 * 60; // 12 hours in seconds

/**
 * Returns the Set-Cookie options for the auth token.
 * HttpOnly + Secure + SameSite=Strict — never accessible from JS (SRS RF-SG-029).
 */
export function buildAuthCookieOptions() {
  return {
    name:     COOKIE_NAME,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge:   COOKIE_MAX_AGE,
    path:     '/',
  };
}

/**
 * Returns the Set-Cookie options to clear the auth token on logout.
 */
export function buildClearCookieOptions() {
  return {
    name:     COOKIE_NAME,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge:   0,
    path:     '/',
  };
}