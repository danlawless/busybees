'use client'

import React, { useState, useEffect } from 'react'
import { useEditor } from './EditorProvider'

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
  const [currentPath, setCurrentPath] = useState('/')

  useEffect(() => {
    setIsMounted(true)
    if (typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname)
    }
  }, [])

  // Show header when authenticated AND either on editor page OR has editor param
  const shouldShow = isMounted && 
                    isAuthenticated && 
                    typeof window !== 'undefined' && 
                    (window.location.pathname === '/editor' || 
                     window.location.search.includes('editor=true'))

  // Don't render anything during SSR or when conditions not met
  if (!isMounted || !shouldShow) return null

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const success = await saveContent()
      console.log(success ? '✅ Saved' : '❌ Save failed')
    } catch (error) {
      console.error('Save error:', error)
    }
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
      // Preserve editor mode when navigating
      window.location.href = path + '?editor=true'
    }
  }

  return (
    <>
      {/* Fixed Header Toolbar (matches HTML version) */}
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
        {/* Left - Brand and Status */}
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
            <span>📍 {currentPath}</span>
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

        {/* Center - Page Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', opacity: 0.8 }}>Page:</span>
          <select 
            value={currentPath}
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
            <option value="/editor">⚙️ Dashboard</option>
          </select>
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
              background: '#6b7280',
              color: 'white',
              border: 'none',
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
