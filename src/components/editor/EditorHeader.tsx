'use client'

import React, { useState, useEffect } from 'react'
import { useEditor } from './EditorProvider'

/**
 * Editor Header - Fixed toolbar when authenticated
 * Replicates HTML version's editor-toolbar exactly
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
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Only show header when authenticated and not on editor page
  const shouldShow = isMounted && 
                    isAuthenticated && 
                    typeof window !== 'undefined' && 
                    window.location.pathname !== '/editor'

  if (!shouldShow) return null

  const handleSave = async () => {
    setIsLoading(true)
    const success = await saveContent()
    setIsLoading(false)
  }

  const handleCommitToGitHub = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/editor/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'commit', 
          content: {},
          message: `Update content via Universal Editor - ${new Date().toLocaleString()}`
        })
      })
      
      const data = await response.json()
      console.log(data.success ? '✅ Committed to GitHub' : '❌ Commit failed')
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
      {/* Editor Toolbar - exact replica of HTML version */}
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
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        {/* Left - Brand and Instructions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600'
          }}>
            {config.brandName || 'Universal Editor'}
          </h1>
          
          {isEditing && (
            <div style={{
              fontSize: '13px',
              opacity: 0.9,
              fontStyle: 'italic'
            }}>
              Click any text to edit directly
            </div>
          )}
        </div>

        {/* Center - Page Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '13px', opacity: 0.8 }}>Page:</span>
          <select 
            value={isMounted ? window.location.pathname : '/'}
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
          
          <div style={{
            fontSize: '12px',
            opacity: 0.8,
            background: 'rgba(255,255,255,0.1)',
            padding: '4px 8px',
            borderRadius: '4px'
          }}>
            {fields.length} fields
          </div>
        </div>

        {/* Right - Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <button
            onClick={detectFields}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            🔍 Scan
          </button>

          <button
            onClick={toggleEditing}
            style={{
              background: isEditing ? '#27ae60' : '#3498db',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
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
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
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
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            🚀 Commit
          </button>

          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.open('/editor', '_blank')
              }
            }}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            📊
          </button>

          <button
            onClick={logout}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Content spacer to push page content below header */}
      <div style={{ height: '60px' }} />
    </>
  )
}
