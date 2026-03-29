import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { buildClearCookieOptions } from '@/lib/rbac';
import { writeAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  // Extract user before clearing the cookie — used for audit log.
  // If the token is already invalid/expired, we still clear the cookie gracefully.
  const authResult = requireAuth(req);
  const isAuthenticated = !(authResult instanceof NextResponse);

  if (isAuthenticated) {
    await writeAuditLog({
      userId:   authResult.userId,
      action:   'LOGOUT',
      module:   'identity',
      recordId: String(authResult.userId),
      oldData:  null,
      newData:  null,
    });
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set({
    ...buildClearCookieOptions(),
    value: '',
  });

  return response;
}