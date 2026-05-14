import { SignJWT, jwtVerify } from 'jose';

function resolveJwtSecret(): Uint8Array {
  const s = process.env.JWT_SECRET?.trim();
  if (s !== undefined && s.length >= 16) {
    return new TextEncoder().encode(s);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set (minimum 16 characters) in production.');
  }
  return new TextEncoder().encode('dev-siu-hotel-jwt-secret-min-32chars');
}

export function getBearerToken(request: Request): string | null {
  const raw = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (raw === null || raw === '') return null;
  const m = /^Bearer\s+(.+)$/i.exec(raw.trim());
  return m?.[1]?.trim() !== undefined && m[1]!.trim() !== '' ? m[1]!.trim() : null;
}

export async function signStaffToken(userId: string): Promise<string> {
  const secret = resolveJwtSecret();
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyStaffToken(token: string): Promise<{ sub: string }> {
  const secret = resolveJwtSecret();
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
  const sub = payload.sub;
  if (typeof sub !== 'string' || sub === '') {
    throw new Error('Invalid token payload');
  }
  return { sub };
}
