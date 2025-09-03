'use client'

// Force this page to be client-only to prevent hydration issues
export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EditorPage() {
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Don't render anything during SSR
  if (!isMounted) {
    return <div style={{ minHeight: '100vh', background: '#f3f4f6' }} />
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/editor/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', password })
      })
      
      const data = await response.json()
      if (data.success) {
        // Store auth for persistence
        localStorage.setItem('editor-token', data.token)
        localStorage.setItem('editor-authenticated', 'true')
        
        // Redirect to homepage with editor enabled
        router.push('/?editor=true')
      } else {
        alert('❌ Invalid password')
      }
    } catch (error) {
      console.error('Login error:', error)
      alert('❌ Login failed')
    }
    
    setIsLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 25px 50px rgba(37, 99, 235, 0.3)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          color: '#2563eb', 
          marginBottom: '10px',
          fontSize: '2rem',
          fontWeight: 'bold'
        }}>
          Universal Editor
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '30px' }}>
          Visual Content Management
        </p>
        
        <form onSubmit={handleLogin}>
          <input
            type="password"
            placeholder="Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '16px',
              marginBottom: '20px',
              boxSizing: 'border-box'
            }}
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? 'Logging in...' : 'Start Editing'}
          </button>
        </form>
        
        <p style={{ 
          fontSize: '0.9rem', 
          color: '#6b7280', 
          marginTop: '20px' 
        }}>
          Password: <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>universal2025!</code>
        </p>
      </div>
    </div>
  )
}
