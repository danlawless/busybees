'use client'

import React, { useEffect, useState } from 'react'
import { useEditor } from './EditorProvider'

export function VisualEditingOverlay() {
  const { 
    isAuthenticated, 
    isEditing, 
    fields, 
    content, 
    updateField,
    config
  } = useEditor()

  const [editingElement, setEditingElement] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Setup visual editing when authenticated and fields are detected
  useEffect(() => {
    if (!isMounted) return
    
    if (isAuthenticated && 
        fields.length > 0 &&
        typeof window !== 'undefined' && 
        window.location.pathname !== '/editor') {
      
      // Always show visual indicators when authenticated and fields exist
      showVisualIndicators()
      
      if (isEditing) {
        makeElementsClickToEdit()
      } else {
        removeClickToEdit()
      }
    } else {
      removeAllVisualElements()
    }

    return () => removeAllVisualElements()
  }, [isMounted, isAuthenticated, isEditing, fields])

  const showVisualIndicators = () => {
    console.log('🎨 Showing visual indicators for', fields.length, 'fields')
    
    fields.forEach(field => {
      const element = document.querySelector(`[data-editor-id="${field.id}"]`) as HTMLElement
      if (!element) return

      // Add visual indicators (blue boxes like HTML version)
      element.style.position = 'relative'
      element.style.outline = '2px dashed #3498db'
      element.style.outlineOffset = '2px'
      element.style.backgroundColor = 'rgba(52, 152, 219, 0.05)'
      element.style.transition = 'all 0.2s ease'
      
      // Add a small label (like HTML version)
      const existingLabel = element.querySelector('.editor-field-label')
      if (!existingLabel) {
        const label = document.createElement('div')
        label.className = 'editor-field-label'
        label.textContent = field.type
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
        element.appendChild(label)
      }
    })
  }

  const makeElementsClickToEdit = () => {
    if (typeof window === 'undefined') return
    
    fields.forEach(field => {
      const element = document.querySelector(`[data-editor-id="${field.id}"]`) as HTMLElement
      if (!element) return

      // Enhanced visual for editing mode
      element.style.cursor = 'pointer'
      
      // Hover effects
      const handleMouseEnter = () => {
        if (editingElement !== field.id) {
          element.style.outline = '2px solid #3498db'
          element.style.backgroundColor = 'rgba(52, 152, 219, 0.15)'
        }
      }

      const handleMouseLeave = () => {
        if (editingElement !== field.id) {
          element.style.outline = '2px dashed #3498db'
          element.style.backgroundColor = 'rgba(52, 152, 219, 0.05)'
        }
      }

      // Click to edit
      const handleClick = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
        
        if (editingElement && editingElement !== field.id) {
          finishEditing(editingElement)
          setTimeout(() => startEditing(field.id, element), 200)
          return
        }
        
        startEditing(field.id, element)
      }

      element.addEventListener('mouseenter', handleMouseEnter)
      element.addEventListener('mouseleave', handleMouseLeave)
      element.addEventListener('click', handleClick)
      
      element.setAttribute('data-click-editor', 'true')
    })
  }

  const removeClickToEdit = () => {
    if (typeof window === 'undefined') return
    
    const clickElements = document.querySelectorAll('[data-click-editor="true"]')
    clickElements.forEach(element => {
      const htmlElement = element as HTMLElement
      htmlElement.style.cursor = ''
      htmlElement.removeAttribute('data-click-editor')
    })
  }

  const removeAllVisualElements = () => {
    if (typeof window === 'undefined') return
    
    const allElements = document.querySelectorAll('[data-editor-id]')
    allElements.forEach(element => {
      const htmlElement = element as HTMLElement
      
      // Remove all styling
      htmlElement.style.outline = ''
      htmlElement.style.outlineOffset = ''
      htmlElement.style.backgroundColor = ''
      htmlElement.style.cursor = ''
      htmlElement.style.transition = ''
      
      // Remove labels
      const label = htmlElement.querySelector('.editor-field-label')
      if (label) label.remove()
      
      htmlElement.removeAttribute('contenteditable')
      htmlElement.removeAttribute('data-click-editor')
    })
    
    setEditingElement(null)
  }

  const startEditing = (fieldId: string, element: HTMLElement) => {
    console.log('🖱️ Starting to edit:', fieldId)
    setEditingElement(fieldId)
    
    // Active editing visual (green like HTML version)
    element.style.outline = '2px solid #27ae60'
    element.style.backgroundColor = 'rgba(39, 174, 96, 0.15)'
    
    const originalContent = element.textContent || ''
    element.setAttribute('data-original-content', originalContent)
    
    element.contentEditable = 'true'
    element.focus()
    
    // Select all text
    if (typeof window !== 'undefined') {
      const range = document.createRange()
      range.selectNodeContents(element)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    }

    const handleBlur = () => {
      const newContent = element.textContent || ''
      if (newContent !== originalContent) {
        updateField(fieldId, newContent)
        console.log(`✏️ Updated ${fieldId}`)
      }
      finishEditing(fieldId)
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

  const finishEditing = (fieldId: string) => {
    const element = document.querySelector(`[data-editor-id="${fieldId}"]`) as HTMLElement
    if (element) {
      element.contentEditable = 'false'
      element.style.outline = '2px dashed #3498db'
      element.style.backgroundColor = 'rgba(52, 152, 219, 0.05)'
      element.removeAttribute('data-original-content')
    }
    setEditingElement(null)
  }

  const navigateToPage = (path: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = path + '?editor=true'
    }
  }

  return (
    <>
      {/* Fixed Header Toolbar */}
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
        {/* Left - Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            {config.brandName || 'Universal Editor'}
          </h1>
          
          {isEditing && (
            <div style={{ fontSize: '13px', opacity: 0.9, fontStyle: 'italic' }}>
              Click any highlighted text to edit
            </div>
          )}
        </div>

        {/* Center - Page Navigation */}
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
            <option value="/editor">⚙️ Dashboard</option>
          </select>
          
          <span style={{
            fontSize: '12px',
            background: 'rgba(255,255,255,0.1)',
            padding: '4px 8px',
            borderRadius: '4px'
          }}>
            {fields.length} fields
          </span>
        </div>

        {/* Right - Controls */}
        <div style={{ display: 'flex', gap: '8px' }}>
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
            {isEditing ? 'Stop' : 'Edit'}
          </button>

          <button
            onClick={handleSave}
            style={{
              background: '#27ae60',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            💾
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
