import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const ADMIN_PASSWORD = 'universal2025!';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, password, token } = body;

    if (action === 'login') {
      if (password === ADMIN_PASSWORD) {
        const authToken = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '24h' });
        return NextResponse.json({ 
          success: true, 
          token: authToken,
          message: 'Authentication successful' 
        });
      } else {
        return NextResponse.json({ 
          success: false, 
          message: 'Invalid password' 
        }, { status: 401 });
      }
    }

    if (action === 'verify') {
      try {
        jwt.verify(token, JWT_SECRET);
        return NextResponse.json({ 
          success: true, 
          message: 'Token valid' 
        });
      } catch (error) {
        return NextResponse.json({ 
          success: false, 
          message: 'Invalid token' 
        }, { status: 401 });
      }
    }

    return NextResponse.json({ 
      success: false, 
      message: 'Invalid action' 
    }, { status: 400 });

  } catch (error) {
    console.error('Auth API error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error' 
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
