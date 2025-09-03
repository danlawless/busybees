'use client'

import React, { useEffect, useState } from 'react'
import { useEditor } from './EditorProvider'

/**
 * Visual Editor - Click-to-Edit Overlay System
 * Replicates the HTML version's visual editing capabilities
 */
export function VisualEditor() {
  const { 
    isAuthenticated, 
    isEditing, 
    fields, 
    content, 
    updateField, 
    saveContent,
    config
  } = useEditor()

  const [editingElement, setEditingElement] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  // Show visual editor when authenticated and on non-editor pages
  useEffect(() => {
    const shouldShow = isAuthenticated && 
                     typeof window !== 'undefined' && 
                     window.location.pathname !== '/editor'
    setIsVisible(shouldShow)
  }, [isAuthenticated])

  // Setup visual editing when editing mode is enabled
  useEffect(() => {
    if (isVisible && isEditing) {
      makeElementsVisuallyEditable()
    } else {
      removeVisualEditing()
    }
  }, [isVisible, isEditing, fields])

  const makeElementsVisuallyEditable = () => {
    fields.forEach(field => {
      const element = document.querySelector(`[data-editor-id="${field.id}"]`) as HTMLElement
      if (!element) return

      // Visual indicators like HTML version
      element.style.position = 'relative'
      element.style.outline = '2px dashed #2563eb'
      element.style.outlineOffset = '2px'
      element.style.backgroundColor = 'rgba(37, 99, 235, 0.05)'
      element.style.cursor = 'pointer'
      element.style.transition = 'all 0.2s ease'

      // Hover effects
      const handleMouseEnter = () => {
        if (editingElement !== field.id) {
          element.style.outline = '2px solid #2563eb'
          element.style.backgroundColor = 'rgba(37, 99, 235, 0.1)'
        }
      }

      const handleMouseLeave = () => {
        if (editingElement !== field.id) {
          element.style.outline = '2px dashed #2563eb'
          element.style.backgroundColor = 'rgba(37, 99, 235, 0.05)'
        }
      }

      // Click to edit
      const handleClick = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
        startEditing(field.id, element)
      }

      element.addEventListener('mouseenter', handleMouseEnter)
      element.addEventListener('mouseleave', handleMouseLeave)
      element.addEventListener('click', handleClick)
      
      // Store event listeners for cleanup
      element.setAttribute('data-editor-listeners', 'true')
    })
  }

  const removeVisualEditing = () => {
    fields.forEach(field => {
      const element = document.querySelector(`[data-editor-id="${field.id}"]`) as HTMLElement
      if (!element) return

      // Remove visual indicators
      element.style.outline = ''
      element.style.outlineOffset = ''
      element.style.backgroundColor = ''
      element.style.cursor = ''
      element.style.transition = ''
      
      // Remove contenteditable
      element.removeAttribute('contenteditable')
      
      // Clean up event listeners (simplified)
      if (element.hasAttribute('data-editor-listeners')) {
        element.removeAttribute('data-editor-listeners')
        // In a real implementation, you'd store and remove specific listeners
      }
    })
    
    setEditingElement(null)
  }

  const startEditing = (fieldId: string, element: HTMLElement) => {
    // Stop editing any other element first
    if (editingElement && editingElement !== fieldId) {
      finishEditing()
    }

    console.log('🖱️ Starting to edit:', fieldId)
    setEditingElement(fieldId)
    
    // Visual feedback for active editing
    element.style.outline = '2px solid #059669'
    element.style.backgroundColor = 'rgba(5, 150, 105, 0.1)'
    
    // Make element editable
    element.contentEditable = 'true'
    element.focus()
    
    // Select all text
    const range = document.createRange()
    range.selectNodeContents(element)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)

    // Handle saving on blur
    const handleBlur = () => {
      const newContent = element.textContent || ''
      if (newContent !== content[fieldId]) {
        updateField(fieldId, newContent)
        console.log(`✏️ Updated ${fieldId}:`, newContent)
      }
      finishEditing()
    }

    // Handle Enter key to save
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        element.blur()
      }
      if (e.key === 'Escape') {
        // Restore original content
        element.textContent = content[fieldId] || field.content
        element.blur()
      }
    }

    element.addEventListener('blur', handleBlur, { once: true })
    element.addEventListener('keydown', handleKeyDown)
  }

  const finishEditing = () => {
    if (!editingElement) return
    
    const element = document.querySelector(`[data-editor-id="${editingElement}"]`) as HTMLElement
    if (element) {
      element.contentEditable = 'false'
      element.style.outline = '2px dashed #2563eb'
      element.style.backgroundColor = 'rgba(37, 99, 235, 0.05)'
    }
    
    setEditingElement(null)
  }

  // Don't render anything if not visible
  if (!isVisible) return null

  return (
    <>
      {/* Floating Editor Controls */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '15px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        fontSize: '14px',
        minWidth: '200px'
      }}>
        <div style={{
          fontWeight: '600',
          color: '#111827',
          marginBottom: '10px',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '8px'
        }}>
          {config.brandName}
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '400' }}>
            {fields.length} fields • {isEditing ? 'Editing ON' : 'Click to enable'}
          </div>
        </div>

        {!isEditing && (
          <button
            onClick={() => {
              // Enable editing mode in the EditorProvider
              const event = new CustomEvent('editor-toggle-editing')
              window.dispatchEvent(event)
            }}
            style={{
              width: '100%',
              background: config.colors?.primary || '#2563eb',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              marginBottom: '8px'
            }}
          >
            ✏️ Enable Editing
          </button>
        )}

        {isEditing && (
          <>
            <button
              onClick={async () => {
                const success = await saveContent()
                if (success) {
                  alert('✅ Content saved!')
                } else {
                  alert('❌ Save failed')
                }
              }}
              style={{
                width: '100%',
                background: config.colors?.success || '#059669',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                marginBottom: '8px'
              }}
            >
              💾 Save Changes
            </button>
            
            <button
              onClick={() => {
                const event = new CustomEvent('editor-toggle-editing')
                window.dispatchEvent(event)
              }}
              style={{
                width: '100%',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              ❌ Stop Editing
            </button>
          </>
        )}

        <button
          onClick={() => window.open('/editor', '_blank')}
          style={{
            width: '100%',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            marginTop: '8px'
          }}
        >
          📊 Dashboard
        </button>
      </div>

      {/* Editing Instructions */}
      {isEditing && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          zIndex: 9999,
          background: 'rgba(37, 99, 235, 0.95)',
          color: 'white',
          padding: '15px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          maxWidth: '350px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '5px' }}>
            ✏️ Visual Editing Active
          </div>
          <div style={{ fontSize: '13px', opacity: 0.9 }}>
            • Click any highlighted text to edit it<br/>
            • Press Enter to save, Escape to cancel<br/>
            • Changes auto-save when you click away
          </div>
        </div>
      )}

      {editingElement && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10000,
          background: 'white',
          border: '2px solid #059669',
          borderRadius: '8px',
          padding: '10px',
          fontSize: '12px',
          color: '#059669',
          fontWeight: '600',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
        }}>
          ✏️ Editing: {editingElement}
        </div>
      )}
    </>
  )
}

// Add event listener for toggle editing
if (typeof window !== 'undefined') {
  window.addEventListener('editor-toggle-editing', () => {
    // This will be handled by the EditorProvider
    console.log('Toggle editing event received')
  })
}
