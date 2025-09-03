import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'universal-editor-secret'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
const GITHUB_REPO = process.env.GITHUB_REPO || 'danlawless/busybees'

function verifyAuth(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, token, message, content } = await request.json()
    
    const authHeader = request.headers.get('Authorization')
    const authToken = authHeader?.replace('Bearer ', '') || token

    if (!verifyAuth(authToken)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 })
    }

    if (!GITHUB_TOKEN) {
      return NextResponse.json({ 
        success: false, 
        message: 'GitHub token not configured' 
      }, { status: 500 })
    }

    if (action === 'commit') {
      // Save content to content.json and commit to GitHub
      const fs = require('fs')
      const path = require('path')
      
      const contentFile = path.join(process.cwd(), 'editor', 'shared', 'content.json')
      
      // Ensure directory exists
      const dir = path.dirname(contentFile)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      
      // Save content locally
      fs.writeFileSync(contentFile, JSON.stringify(content, null, 2))
      
      // Commit to GitHub
      const fileContent = Buffer.from(JSON.stringify(content, null, 2)).toString('base64')
      const commitMessage = message || `Update content via Universal Editor - ${new Date().toISOString()}`
      
      // Get current file SHA
      let currentSha = null
      try {
        const getResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/editor/shared/content.json`, {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        })
        
        if (getResponse.ok) {
          const fileData = await getResponse.json()
          currentSha = fileData.sha
        }
      } catch (error) {
        console.log('File may not exist yet, creating new file')
      }
      
      // Commit the file
      const commitData = {
        message: commitMessage,
        content: fileContent,
        ...(currentSha && { sha: currentSha })
      }
      
      const commitResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/editor/shared/content.json`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(commitData)
      })
      
      if (commitResponse.ok) {
        const result = await commitResponse.json()
        return NextResponse.json({ 
          success: true, 
          message: 'Content committed to GitHub successfully',
          commit: result.commit
        })
      } else {
        const error = await commitResponse.text()
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to commit to GitHub: ' + error 
        }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: false, 
      message: 'Invalid action' 
    }, { status: 400 })

  } catch (error) {
    console.error('GitHub API error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    }, { status: 500 })
  }
}
