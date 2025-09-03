'use client'

import React, { useState } from 'react'
import { useEditor } from './EditorProvider'

export function EditorDashboard() {
  const { 
    config, 
    isAuthenticated, 
    fields, 
    content, 
    login, 
    logout, 
    toggleEditing, 
    isEditing,
    saveContent,
    detectFields,
    updateField
  } = useEditor()
  
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    console.log('🔐 Dashboard login attempt with password:', password)
    const success = await login(password)
    if (!success) {
      alert('Invalid password - check console for details')
    }
    setIsLoading(false)
  }

  const handleSave = async () => {
    setIsLoading(true)
    const success = await saveContent()
    if (success) {
      alert('Content saved successfully!')
    } else {
      alert('Failed to save content')
    }
    setIsLoading(false)
  }

  const handleDetectFields = () => {
    console.log('🔍 Manual field detection triggered')
    detectFields()
  }

  if (!isAuthenticated) {
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
            {config.brandName || 'Universal Editor'}
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '30px' }}>
            Content Management System
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
                background: config.colors?.primary || '#2563eb',
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
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          
          <p style={{ 
            fontSize: '0.9rem', 
            color: '#6b7280', 
            marginTop: '20px' 
          }}>
            Try password: <code>universal2025!</code>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        padding: '20px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div>
          <h1 style={{ margin: 0, color: '#111827', fontSize: '1.8rem' }}>
            {config.brandName || 'Universal Editor'}
          </h1>
          <p style={{ margin: '5px 0 0 0', color: '#6b7280' }}>
            {fields.length} editable fields detected
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleDetectFields}
            style={{
              background: '#6b7280',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            🔍 Detect Fields
          </button>
          <button
            onClick={toggleEditing}
            style={{
              background: isEditing ? config.colors?.success : config.colors?.primary,
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            {isEditing ? '✅ Editing Active' : '✏️ Start Editing'}
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            style={{
              background: config.colors?.success || '#059669',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            💾 Save Changes
          </button>
          <button
            onClick={logout}
            style={{
              background: '#6b7280',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gap: '20px',
        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))'
      }}>
        {fields.map(field => (
          <div
            key={field.id}
            style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '20px'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <span style={{
                fontWeight: '600',
                color: config.colors?.primary || '#2563eb',
                fontSize: '0.9rem'
              }}>
                {field.id}
              </span>
              <span style={{
                background: config.colors?.primary || '#2563eb',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: '600'
              }}>
                {field.type}
              </span>
            </div>
            
            <textarea
              value={content[field.id] || field.content}
              onChange={(e) => updateField(field.id, e.target.value)}
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '10px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
            
            <div style={{
              fontSize: '0.8rem',
              color: '#6b7280',
              marginTop: '5px'
            }}>
              {field.context.component && `Component: ${field.context.component} | `}
              Section: {field.context.section || 'unknown'} | 
              Selector: {field.selector}
            </div>
          </div>
        ))}
      </div>

      {fields.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#111827', marginBottom: '15px' }}>
            No Editable Fields Detected
          </h3>
          <p style={{ color: '#6b7280', fontSize: '1rem', marginBottom: '20px' }}>
            The field detector is scanning for text content in your React components.
          </p>
          <button
            onClick={handleDetectFields}
            style={{
              background: config.colors?.primary || '#2563eb',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            🔍 Try Detecting Fields Again
          </button>
          <p style={{ 
            fontSize: '0.9rem', 
            color: '#6b7280', 
            marginTop: '15px',
            fontStyle: 'italic'
          }}>
            Open browser console to see detection details
          </p>
        </div>
      )}
    </div>
  )
}

  const handleCommitToGitHub = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/editor/github', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ 
          action: 'commit', 
          content,
          message: `Update content via Universal Editor - ${new Date().toLocaleString()}`
        })
      })
      
      const data = await response.json()
      if (data.success) {
        alert('✅ Content committed to GitHub successfully!')
      } else {
        alert('❌ Failed to commit: ' + data.message)
      }
    } catch (error) {
      console.error('Commit error:', error)
      alert('❌ Commit failed')
    }
    setIsLoading(false)
  }
