import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { verifyPassword } from '@/lib/password';
import { signToken } from '@/lib/jwt';
import { buildAuthCookieOptions } from '@/lib/rbac';
import { nowArgentina } from '@/lib/timezone';
import { writeAuditLog } from '@/lib/audit';
import type { UserRole } from '@/types';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES     = 15;

export async function POST(req: NextRequest) {
  const body = await req.json() as { username?: string; password?: string };

  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json(
      { success: false, error: 'Usuario y contraseña son requeridos.' },
      { status: 400 }
    );
  }

  // Fetch user by username — includes inactive users to return a consistent error.
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    // Do not reveal whether the username exists.
    return NextResponse.json(
      { success: false, error: 'Credenciales inválidas.' },
      { status: 401 }
    );
  }

  // Soft-deleted user — same generic error, no information leakage.
  if (!user.isActive) {
    return NextResponse.json(
      { success: false, error: 'Credenciales inválidas.' },
      { status: 401 }
    );
  }

  // Lockout check (SRS RF-SG-029).
  if (user.lockoutUntil && new Date(user.lockoutUntil) > nowArgentina()) {
    const minutesLeft = Math.ceil(
      (new Date(user.lockoutUntil).getTime() - nowArgentina().getTime()) / 60000
    );
    return NextResponse.json(
      {
        success: false,
        error: `Cuenta bloqueada. Intentá de nuevo en ${minutesLeft} minuto${minutesLeft !== 1 ? 's' : ''}.`,
      },
      { status: 429 }
    );
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);

  if (!passwordValid) {
    const newAttempts = (user.failedLoginAttempts ?? 0) + 1;
    const shouldLock  = newAttempts >= MAX_FAILED_ATTEMPTS;
    const lockoutUntil = shouldLock
      ? new Date(nowArgentina().getTime() + LOCKOUT_MINUTES * 60000)
      : null;

    await db
      .update(users)
      .set({
        failedLoginAttempts: newAttempts,
        ...(shouldLock ? { lockoutUntil } : {}),
      })
      .where(eq(users.userId, user.userId));

    const remainingAttempts = MAX_FAILED_ATTEMPTS - newAttempts;

    return NextResponse.json(
      {
        success: false,
        error: shouldLock
          ? `Cuenta bloqueada por ${LOCKOUT_MINUTES} minutos tras demasiados intentos fallidos.`
          : `Credenciales inválidas. ${remainingAttempts} intento${remainingAttempts !== 1 ? 's' : ''} restante${remainingAttempts !== 1 ? 's' : ''}.`,
      },
      { status: 401 }
    );
  }

  // Successful login — reset lockout counters.
  await db
    .update(users)
    .set({ failedLoginAttempts: 0, lockoutUntil: null })
    .where(eq(users.userId, user.userId));

  const token = signToken({
    userId:             user.userId,
    username:           user.username,
    fullName:           user.fullName,
    role:               user.role as UserRole,
    themePreference:    user.themePreference ?? 'system',
    fontSizePreference: user.fontSizePreference ?? 'large',
  });

  await writeAuditLog({
    userId:   user.userId,
    action:   'LOGIN',
    module:   'identity',
    recordId: String(user.userId),
    oldData:  null,
    newData:  { username: user.username, role: user.role },
  });

  const response = NextResponse.json({
    success: true,
    data: {
      userId:             user.userId,
      username:           user.username,
      fullName:           user.fullName,
      role:               user.role,
      themePreference:    user.themePreference ?? 'system',
      fontSizePreference: user.fontSizePreference ?? 'large',
    },
  });

  response.cookies.set({
    ...buildAuthCookieOptions(),
    value: token,
  });

  return response;
}