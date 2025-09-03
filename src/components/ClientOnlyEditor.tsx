'use client'

import React, { useState, useEffect } from 'react'

export default function ClientOnlyEditor() {
  const [isMounted, setIsMounted] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [fieldsCount, setFieldsCount] = useState(0)

  useEffect(() => {
    setIsMounted(true)
    
    // Check if we should show the editor
    if (typeof window !== 'undefined') {
      const hasEditorParam = window.location.search.includes('editor=true')
      const isAuthenticated = localStorage.getItem('editor-authenticated') === 'true'
      
      console.log('🔍 Editor check:', { 
        hasEditorParam, 
        isAuthenticated, 
        currentPath: window.location.pathname,
        search: window.location.search 
      })
      
      if (hasEditorParam && isAuthenticated) {
        setShowEditor(true)
        console.log('✅ Showing editor header')
        setTimeout(() => detectAndShowFields(), 1000)
      } else {
        console.log('❌ Not showing editor:', { hasEditorParam, isAuthenticated })
      }
    }
  }, [])

  const detectAndShowFields = () => {
    if (typeof window === 'undefined') return
    
    console.log('🔍 Starting field detection...')
    const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, button')
    let detectedCount = 0
    
    textElements.forEach((element) => {
      const text = element.textContent?.trim() || ''
      
      if (text && text.length > 3 && text.length < 500 && element.children.length <= 2) {
        detectedCount++
        const fieldId = `field-${detectedCount}`
        
        console.log(`✅ Found field ${detectedCount}: "${text.substring(0, 30)}..."`)
        
        // Add visual indicators
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
    console.log(`�� Total detected: ${detectedCount} fields`)
  }

  const startEditing = (element: HTMLElement, fieldId: string) => {
    console.log('🖱️ Starting to edit:', fieldId)
    
    // Green outline for active editing
    element.style.outline = '2px solid #27ae60'
    element.style.backgroundColor = 'rgba(39, 174, 96, 0.15)'
    
    const originalContent = element.textContent || ''
    element.contentEditable = 'true'
    element.focus()

    // Select all text
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
        console.log(`✏️ Content updated: "${newContent}"`)
        // TODO: Save to content.json and commit to GitHub
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

  const navigateToPage = (path: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = path + '?editor=true'
    }
  }

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('editor-authenticated')
      localStorage.removeItem('editor-token')
      window.location.href = '/editor'
    }
  }

  // Show debug info and editor header
  if (!isMounted) return null

  return (
    <>
      {/* Debug info (remove in production) */}
      {isMounted && (
        <div style={{
          position: 'fixed',
          bottom: '10px',
          left: '10px',
          background: 'black',
          color: 'white',
          padding: '10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 9999,
          fontFamily: 'monospace'
        }}>
          Debug: mounted={String(isMounted)} | showEditor={String(showEditor)} | 
          hasParam={String(typeof window !== 'undefined' && window.location.search.includes('editor=true'))} |
          isAuth={String(typeof window !== 'undefined' && localStorage.getItem('editor-authenticated') === 'true')}
        </div>
      )}

      {/* Editor Header */}
      {showEditor && (
        <>
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
                {fieldsCount} fields detected • Click any blue box to edit
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select 
                value={typeof window !== 'undefined' ? window.location.pathname : '/'}
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
      )}
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
