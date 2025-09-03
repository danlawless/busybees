'use client'

import React, { useState } from 'react'
import { useEditor } from './EditorProvider'

/**
 * Editor Header - Replicates HTML version's editor-toolbar
 * Fixed header that appears when logged in, disappears when logged out
 */
export function EditorHeader() {
  const { 
    config, 
    isAuthenticated, 
    isEditing, 
    fields, 
    toggleEditing, 
    saveContent, 
    detectFields,
    logout 
  } = useEditor()

  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState('/')

  // Only show header when authenticated and not on editor page
  const shouldShow = isAuthenticated && 
                    typeof window !== 'undefined' && 
                    window.location.pathname !== '/editor'

  if (!shouldShow) return null

  const handleSave = async () => {
    setIsLoading(true)
    const success = await saveContent()
    if (success) {
      console.log('✅ Content saved')
    }
    setIsLoading(false)
  }

  const handleCommitToGitHub = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/editor/github', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          action: 'commit', 
          content: {},
          message: `Update content via Universal Editor - ${new Date().toLocaleString()}`
        })
      })
      
      const data = await response.json()
      if (data.success) {
        console.log('✅ Committed to GitHub')
      }
    } catch (error) {
      console.error('Commit error:', error)
    }
    setIsLoading(false)
  }

  const navigateToPage = (path: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = path
    }
  }

  return (
    <>
      {/* Editor Toolbar - matches HTML version styling */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        color: 'white',
        padding: '15px 25px',
        zIndex: 10000,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 20px rgba(37, 99, 235, 0.3)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        fontSize: '14px',
        fontFamily: 'system-ui, sans-serif'
      }}>
        {/* Left side - Brand and status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600'
          }}>
            {config.brandName || 'Universal Editor'}
          </h1>
          
          <div style={{
            fontSize: '13px',
            opacity: 0.9,
            display: 'flex',
            alignItems: 'center',
            gap: '15px'
          }}>
            <span>📍 {window.location.pathname}</span>
            <span>📝 {fields.length} fields</span>
            <span style={{
              background: isEditing ? '#059669' : 'rgba(255,255,255,0.2)',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              {isEditing ? '✏️ Editing' : '👁️ Viewing'}
            </span>
          </div>
        </div>

        {/* Center - Page Navigation (like HTML version) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', opacity: 0.8 }}>Navigate:</span>
          <select 
            value={window.location.pathname}
            onChange={(e) => navigateToPage(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '13px'
            }}
          >
            <option value="/">🏠 Home</option>
            <option value="/about">📖 About</option>
            <option value="/contact">📞 Contact</option>
            <option value="/parties">🎉 Parties</option>
            <option value="/info">ℹ️ Info</option>
            <option value="/classes">📚 Classes</option>
          </select>
        </div>

        {/* Right side - Action buttons (like HTML version) */}
        <div style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center'
        }}>
          <button
            onClick={detectFields}
            style={{
              background: '#6b7280',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600'
            }}
          >
            🔍 Scan
          </button>

          <button
            onClick={toggleEditing}
            style={{
              background: isEditing ? '#059669' : '#3498db',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600'
            }}
          >
            {isEditing ? '✅ Stop' : '✏️ Edit'}
          </button>

          <button
            onClick={handleSave}
            disabled={isLoading}
            style={{
              background: '#27ae60',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            💾 Save
          </button>

          <button
            onClick={handleCommitToGitHub}
            disabled={isLoading}
            style={{
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            🚀 Commit
          </button>

          <button
            onClick={() => window.open('/editor', '_blank')}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600'
            }}
          >
            📊 Dashboard
          </button>

          <button
            onClick={logout}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Push content down when header is visible */}
      <div style={{
        height: '60px',
        width: '100%'
      }} />

      {/* Editing instructions (like HTML version) */}
      {isEditing && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'rgba(37, 99, 235, 0.95)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
        }}>
          ✏️ Click any highlighted text to edit directly • Enter to save • Escape to cancel
        </div>
      )}
    </>
  )
}
