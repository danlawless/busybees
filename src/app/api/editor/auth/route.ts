import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'universal-editor-secret'

export async function POST(request: NextRequest) {
  try {
    const { action, password, token } = await request.json()

    if (action === 'login') {
      const adminPassword = process.env.EDITOR_PASSWORD || 'universal2025!'
      
      if (password === adminPassword) {
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
