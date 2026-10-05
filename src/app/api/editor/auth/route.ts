import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

// No fallback: a default secret in the source would let anyone mint a token.
const JWT_SECRET = process.env.JWT_SECRET

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, password, token } = body

    // Fail closed: without both settings the editor is simply off. (It used
    // to fall back to a password and secret written in the source, and logged
    // the password typed alongside the expected one.)
    const adminPassword = process.env.EDITOR_PASSWORD
    if (!JWT_SECRET || !adminPassword) {
      return NextResponse.json({ success: false, message: 'Editor is not configured' }, { status: 503 })
    }

    if (action === 'login') {
      if (typeof password === 'string' && password === adminPassword) {
        const authToken = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '24h' })
        return NextResponse.json({ 
          success: true, 
          token: authToken,
          message: 'Authentication successful' 
        })
      } else {
        return NextResponse.json({ 
          success: false, 
          message: 'Invalid password' 
        }, { status: 401 })
      }
    }

    if (action === 'verify') {
      try {
        jwt.verify(token, JWT_SECRET)
        return NextResponse.json({ success: true, message: 'Token valid' })
      } catch (error) {
        return NextResponse.json({ 
          success: false, 
          message: 'Invalid token' 
        }, { status: 401 })
      }
    }

    return NextResponse.json({ 
      success: false, 
      message: 'Invalid action' 
    }, { status: 400 })

  } catch (error) {
    console.error('Auth API error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Server error'
    }, { status: 500 })
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
  })
}
