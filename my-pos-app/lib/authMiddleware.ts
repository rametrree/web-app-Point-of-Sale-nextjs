// lib/authMiddleware.ts
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }
  return secret;
};

interface UserPayload {
  userId: string;
  role: string;
  iat: number;
  exp: number;
}

export async function verifyTokenAndRole(request: Request, requiredRoles: string[]): Promise<UserPayload | NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'Authorization token missing or malformed' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as UserPayload;

    if (!requiredRoles.includes(decoded.role)) {
      return NextResponse.json({ message: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    return decoded;
  } catch (error) {
    console.error('Token verification error:', error);
    if (error instanceof jwt.TokenExpiredError) {
      return NextResponse.json({ message: 'Unauthorized: Token expired' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Unauthorized: Invalid token' }, { status: 401 });
  }
}
