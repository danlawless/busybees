'use client'

import React, { useState, useEffect } from 'react'
import { useEditor } from './EditorProvider'

/**
 * Visual Editor Overlay - sits on top of your actual website
 * Allows in-place editing of text content
 */
export function VisualEditor() {
  const { 
    config, 
    isAuthenticated, 
    isEditing, 
    fields, 
    content, 
    updateField, 
    saveContent,
    detectFields,
    toggleEditing,
    logout
  } = useEditor()

  const [isVisible, setIsVisible] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Show/hide based on authentication and editing state
  useEffect(() => {
    setIsVisible(isAuthenticated)
  }, [isAuthenticated])

  // Make elements editable when editing is enabled
  useEffect(() => {
    if (isEditing) {
      makeElementsEditable()
    } else {
      removeEditableState()
    }
  }, [isEditing, fields])

  const makeElementsEditable = () => {
    fields.forEach(field => {
      const element = document.querySelector(`[data-editor-id="${field.id}"]`)
      if (element) {
        element.setAttribute('contenteditable', 'true')
        element.style.outline = '2px dashed #2563eb'
        element.style.backgroundColor = 'rgba(37, 99, 235, 0.1)'
        element.style.cursor = 'text'
        
        // Add blur event to save changes
        const handleBlur = (e: Event) => {
          const newContent = (e.target as Element).textContent || ''
          if (newContent !== field.content) {
            updateField(field.id, newContent)
            console.log(`✏️ Updated field ${field.id}:`, newContent)
          }
        }
        
        element.addEventListener('blur', handleBlur)
        element.setAttribute('data-editor-listener', 'true')
      }
    })
  }

  const removeEditableState = () => {
    fields.forEach(field => {
      const element = document.querySelector(`[data-editor-id="${field.id}"]`)
      if (element) {
        element.removeAttribute('contenteditable')
        element.style.outline = ''
        element.style.backgroundColor = ''
        element.style.cursor = ''
        
        // Remove event listeners
        if (element.hasAttribute('data-editor-listener')) {
          element.removeAttribute('data-editor-listener')
          // Note: In a real implementation, you'd want to properly remove the specific listener
        }
      }
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    const success = await saveContent()
    if (success) {
      alert('✅ Content saved successfully!')
    } else {
      alert('❌ Failed to save content')
    }
    setIsSaving(false)
  }

  const handleDetectFields = () => {
    console.log('🔍 Manually detecting fields on current page...')
    detectFields()
  }

  if (!isVisible) return null

  return (
    <>
      {/* Floating Editor Toolbar */}
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
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        minWidth: '200px'
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#111827',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '10px',
          marginBottom: '5px'
        }}>
          {config.brandName} 
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '400' }}>
            {fields.length} fields detected
          </div>
        </div>

        <button
          onClick={handleDetectFields}
          style={{
            background: '#6b7280',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          🔍 Scan Page
        </button>

        <button
          onClick={toggleEditing}
          style={{
            background: isEditing ? config.colors?.success : config.colors?.primary,
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          {isEditing ? '✅ Editing ON' : '✏️ Start Editing'}
        </button>

        {isEditing && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              background: config.colors?.success || '#059669',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              opacity: isSaving ? 0.7 : 1
            }}
          >
            {isSaving ? '💾 Saving...' : '💾 Save All'}
          </button>
        )}

        <button
          onClick={() => window.open('/editor', '_blank')}
          style={{
            background: '#6b7280',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          📊 Dashboard
        </button>

        <button
          onClick={logout}
          style={{
            background: '#dc2626',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          Logout
        </button>
      </div>

      {/* Editing Instructions */}
      {isEditing && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          zIndex: 9999,
          background: 'rgba(37, 99, 235, 0.9)',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '14px',
          maxWidth: '300px'
        }}>
          ✏️ <strong>Editing Mode:</strong> Click any highlighted text to edit it directly on the page.
        </div>
      )}
    </>
  )
}
