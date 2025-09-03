'use client'

import React, { useState, useEffect } from 'react'

/**
 * Client-Only Editor Header - Simple visual editor toolbar
 * Only renders when authenticated and has ?editor=true parameter
 */
export function ClientOnlyEditorHeader() {
  const [isMounted, setIsMounted] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [fieldsCount, setFieldsCount] = useState(0)
  const [currentPath, setCurrentPath] = useState('/')

  useEffect(() => {
    setIsMounted(true)
    
    // Check authentication and editor mode
    if (typeof window !== 'undefined') {
      const isAuth = localStorage.getItem('editor-authenticated') === 'true'
      const hasEditorParam = window.location.search.includes('editor=true')
      
      setIsAuthenticated(isAuth)
      setCurrentPath(window.location.pathname)
      
      if (isAuth && hasEditorParam) {
        detectAndShowFields()
      }
    }
  }, [])

  const detectAndShowFields = () => {
    if (typeof window === 'undefined') return
    
    // Simple field detection
    const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, button')
    let detectedCount = 0
    
    textElements.forEach((element, index) => {
      const text = element.textContent?.trim() || ''
      
      if (text && text.length > 3 && text.length < 500 && element.children.length <= 1) {
        detectedCount++
        const fieldId = `field-${detectedCount}`
        
        // Add visual indicators (blue boxes like HTML version)
        const htmlElement = element as HTMLElement
        htmlElement.style.position = 'relative'
        htmlElement.style.outline = '2px dashed #3498db'
        htmlElement.style.outlineOffset = '2px'
        htmlElement.style.backgroundColor = 'rgba(52, 152, 219, 0.05)'
        htmlElement.style.cursor = 'pointer'
        htmlElement.style.transition = 'all 0.2s ease'
        htmlElement.setAttribute('data-editor-field', fieldId)
        
        // Add type label
        const label = document.createElement('div')
        label.textContent = getFieldType(element)
        label.style.cssText = `
          position: absolute;
          top: -8px;
          left: -2px;
          background: #3498db;
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: 600;
          z-index: 1000;
          pointer-events: none;
          font-family: system-ui;
        `
        htmlElement.appendChild(label)
        
        // Add click to edit
        htmlElement.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          startEditing(htmlElement, fieldId)
        })
      }
    })
    
    setFieldsCount(detectedCount)
    console.log(`🔍 Detected ${detectedCount} editable fields`)
  }

  const startEditing = (element: HTMLElement, fieldId: string) => {
    // Green outline for active editing
    element.style.outline = '2px solid #27ae60'
    element.style.backgroundColor = 'rgba(39, 174, 96, 0.15)'
    
    const originalContent = element.textContent || ''
    element.contentEditable = 'true'
    element.focus()
    
    // Select text
    try {
      const range = document.createRange()
      range.selectNodeContents(element)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    } catch (error) {
      console.log('Selection error:', error)
    }

    const handleBlur = () => {
      const newContent = element.textContent || ''
      element.contentEditable = 'false'
      element.style.outline = '2px dashed #3498db'
      element.style.backgroundColor = 'rgba(52, 152, 219, 0.05)'
      
      if (newContent !== originalContent) {
        console.log(`✏️ Updated ${fieldId}: "${newContent}"`)
        // Here you could save to content.json if needed
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        element.blur()
      }
      if (e.key === 'Escape') {
        element.textContent = originalContent
        element.blur()
      }
    }

    element.addEventListener('blur', handleBlur, { once: true })
    element.addEventListener('keydown', handleKeyDown)
  }

  const toggleEditing = () => {
    setIsEditing(!isEditing)
    if (!isEditing) {
      detectAndShowFields()
    }
  }

  const navigateToPage = (path: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = path + '?editor=true'
    }
  }

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('editor-token')
      localStorage.removeItem('editor-authenticated')
      window.location.href = '/editor'
    }
  }

  // Only show when authenticated and has editor parameter
  const shouldShow = isMounted && 
                    isAuthenticated && 
                    typeof window !== 'undefined' &&
                    window.location.search.includes('editor=true')

  if (!shouldShow) return null

  return (
    <>
      {/* Simple Fixed Header */}
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
        fontSize: '14px',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            Universal Editor
          </h1>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            {fieldsCount} fields detected
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={detectAndShowFields}
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
            onClick={logout}
            style={{
              background: '#dc2626',
              color: 'white',
              border: 'none',
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

      {/* Content spacer */}
      <div style={{ height: '60px' }} />
    </>
  )
}

function getFieldType(element: Element): string {
  const tag = element.tagName.toLowerCase()
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) return 'heading'
  if (tag === 'p') return 'paragraph'
  if (tag === 'button') return 'button'
  if (tag === 'a') return 'link'
  return 'text'
}
