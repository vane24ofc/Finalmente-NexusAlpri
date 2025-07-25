
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// --- Rate Limiting Logic ---
const loginAttempts = new Map<string, { count: number; expiry: number }>();
const RATE_LIMIT_COUNT = 10; // Max attempts
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getIp(req: NextRequest) {
    return req.ip || req.headers.get('x-forwarded-for') || 'unknown';
}

function checkRateLimit(ip: string): boolean {
    const record = loginAttempts.get(ip);
    if (!record) return true; // No record, allow attempt

    // If window has expired, reset the record
    if (Date.now() > record.expiry) {
        loginAttempts.delete(ip);
        return true;
    }
    
    // Check if count exceeds the limit
    return record.count < RATE_LIMIT_COUNT;
}

function recordFailedAttempt(ip: string, email: string, userId?: string) {
    // Record in-memory for rate limiting
    const record = loginAttempts.get(ip) || { count: 0, expiry: Date.now() + RATE_LIMIT_WINDOW_MS };
    record.count++;
    loginAttempts.set(ip, record);
    
    // Record in database for auditing
    prisma.securityLog.create({
        data: {
            event: 'FAILED_LOGIN_ATTEMPT',
            ipAddress: ip,
            emailAttempt: email,
            userId: userId,
        },
    }).catch(console.error); // Log DB errors without blocking the response
}

function recordSuccessfulLogin(ip: string, userId: string) {
    prisma.securityLog.create({
        data: {
            event: 'SUCCESSFUL_LOGIN',
            ipAddress: ip,
            userId: userId,
        }
    }).catch(console.error);
}

// --- Login Route ---
export async function POST(req: NextRequest) {
  const ip = getIp(req);

  if (!checkRateLimit(ip)) {
      return NextResponse.json({ message: 'Demasiados intentos de inicio de sesión. Por favor, inténtalo de nuevo más tarde.' }, { status: 429 });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email y contraseña son requeridos' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.password) {
      recordFailedAttempt(ip, email);
      return NextResponse.json({ message: 'Credenciales inválidas' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      recordFailedAttempt(ip, email, user.id);
      return NextResponse.json({ message: 'Credenciales inválidas' }, { status: 401 });
    }

    // Clear rate limit attempts on successful login
    loginAttempts.delete(ip);
    recordSuccessfulLogin(ip, user.id);

    // Don't include password in the returned user object
    const { password: _, twoFactorSecret, ...userToReturn } = user;

    if (user.isTwoFactorEnabled) {
      return NextResponse.json({
        twoFactorRequired: true,
        userId: user.id,
      });
    }
    
    // Create the session cookie
    await createSession(user.id);

    return NextResponse.json({ user: userToReturn });

  } catch (error) {
    console.error('[LOGIN_ERROR]', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

