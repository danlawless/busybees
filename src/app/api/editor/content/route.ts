import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const CONTENT_FILE = path.join(process.cwd(), 'editor', 'content.json');

function verifyAuth(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function GET() {
  try {
    if (fs.existsSync(CONTENT_FILE)) {
      const content = fs.readFileSync(CONTENT_FILE, 'utf8');
      return NextResponse.json(JSON.parse(content));
    } else {
      return NextResponse.json({
        "site-title": "Your Website Title",
        "site-description": "Your website description"
      });
    }
  } catch (error) {
    console.error('Content API error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to read content' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, token, content, fieldId } = body;

    if (!verifyAuth(token)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    if (action === 'save') {
      fs.writeFileSync(CONTENT_FILE, JSON.stringify(content, null, 2));
      return NextResponse.json({ 
        success: true, 
        message: 'Content saved successfully' 
      });
    }

    if (action === 'update_field') {
      let existingContent = {};
      if (fs.existsSync(CONTENT_FILE)) {
        existingContent = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
      }
      
      existingContent[fieldId] = content;
      fs.writeFileSync(CONTENT_FILE, JSON.stringify(existingContent, null, 2));
      
      return NextResponse.json({ 
        success: true, 
        message: 'Field updated successfully' 
      });
    }

    return NextResponse.json({ 
      success: false, 
      message: 'Invalid action' 
    }, { status: 400 });

  } catch (error) {
    console.error('Content API error:', error);
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
