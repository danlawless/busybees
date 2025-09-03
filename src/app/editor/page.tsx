'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function EditorTogglePage() {
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

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
        // Store auth token
        localStorage.setItem('editor-token', data.token)
        localStorage.setItem('editor-authenticated', 'true')
        
        // Redirect to homepage with editor enabled
        router.push('/?editor=true')
      } else {
        alert('Invalid password')
      }
    } catch (error) {
      console.error('Login error:', error)
      alert('Login failed')
    }
    
    setIsLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('editor-token')
    localStorage.removeItem('editor-authenticated')
    router.push('/')
  }

  // Check if already authenticated
  const isAuthenticated = typeof window !== 'undefined' && 
    localStorage.getItem('editor-authenticated') === 'true'

  if (isAuthenticated) {
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
          maxWidth: '500px',
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
            Visual editing is ready!
          </p>
          
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button
              onClick={() => router.push('/?editor=true')}
              style={{
                background: '#2563eb',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🏠 Edit Homepage
            </button>
            
            <button
              onClick={() => router.push('/about?editor=true')}
              style={{
                background: '#2563eb',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              📖 Edit About
            </button>
            
            <button
              onClick={() => router.push('/contact?editor=true')}
              style={{
                background: '#2563eb',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              �� Edit Contact
            </button>
          </div>
          
          <button
            onClick={handleLogout}
            style={{
              background: '#dc2626',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            Logout
          </button>
        </div>
      </div>
    )
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
            {isLoading ? 'Logging in...' : 'Enable Visual Editor'}
          </button>
        </form>
        
        <p style={{ 
          fontSize: '0.9rem', 
          color: '#6b7280', 
          marginTop: '20px' 
        }}>
          Password: <code>universal2025!</code>
        </p>
      </div>
    </div>
  )
}
