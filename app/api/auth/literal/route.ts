// app/api/auth/literal/route.ts
import { login } from '@/lib/literalClient';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const email = process.env.LITERAL_EMAIL;
    const password = process.env.LITERAL_PASSWORD;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const response = await login(email, password);
    
    if (!response?.login?.token) {
      return NextResponse.json(
        { error: 'Invalid login response' },
        { status: 401 }
      );
    }

    return NextResponse.json({ token: response.login.token });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}