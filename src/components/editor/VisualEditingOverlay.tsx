'use client'

import React, { useEffect, useState } from 'react'
import { useEditor } from './EditorProvider'

/**
 * Visual Editing Overlay - Handles click-to-edit functionality
 * Replicates the HTML version's visual editing behavior
 */
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

  // Setup visual editing when editing mode is enabled
  useEffect(() => {
    if (isAuthenticated && isEditing && typeof window !== 'undefined' && window.location.pathname !== '/editor') {
      makeElementsClickToEdit()
    } else {
      removeClickToEdit()
    }

    return () => removeClickToEdit()
  }, [isAuthenticated, isEditing, fields])

  const makeElementsClickToEdit = () => {
    console.log('🎨 Setting up click-to-edit for', fields.length, 'fields')
    
    fields.forEach(field => {
      const element = document.querySelector(`[data-editor-id="${field.id}"]`) as HTMLElement
      if (!element) return

      // Visual styling (matches HTML version)
      element.style.position = 'relative'
      element.style.outline = '2px dashed #3498db'
      element.style.outlineOffset = '2px'
      element.style.backgroundColor = 'rgba(52, 152, 219, 0.05)'
      element.style.cursor = 'pointer'
      element.style.transition = 'all 0.2s ease'

      // Hover effects (matches HTML version)
      const handleMouseEnter = () => {
        if (editingElement !== field.id) {
          element.style.outline = '2px solid #3498db'
          element.style.backgroundColor = 'rgba(52, 152, 219, 0.1)'
        }
      }

      const handleMouseLeave = () => {
        if (editingElement !== field.id) {
          element.style.outline = '2px dashed #3498db'
          element.style.backgroundColor = 'rgba(52, 152, 219, 0.05)'
        }
      }

      // Click to edit (matches HTML version behavior)
      const handleClick = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
        
        // Don't start editing if another element is being edited
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
      
      // Mark for cleanup
      element.setAttribute('data-visual-editor', 'true')
    })
  }

  const removeClickToEdit = () => {
    // Clean up all visual editing elements
    const editableElements = document.querySelectorAll('[data-visual-editor="true"]')
    editableElements.forEach(element => {
      const htmlElement = element as HTMLElement
      
      // Remove visual styling
      htmlElement.style.outline = ''
      htmlElement.style.outlineOffset = ''
      htmlElement.style.backgroundColor = ''
      htmlElement.style.cursor = ''
      htmlElement.style.transition = ''
      
      // Remove contenteditable
      htmlElement.removeAttribute('contenteditable')
      htmlElement.removeAttribute('data-visual-editor')
    })
    
    setEditingElement(null)
  }

  const startEditing = (fieldId: string, element: HTMLElement) => {
    console.log('🖱️ Starting to edit:', fieldId)
    setEditingElement(fieldId)
    
    // Visual feedback for active editing (matches HTML version)
    element.style.outline = '2px solid #27ae60'
    element.style.backgroundColor = 'rgba(39, 174, 96, 0.1)'
    
    // Store original content
    const originalContent = element.textContent || ''
    element.setAttribute('data-original-content', originalContent)
    
    // Make editable
    element.contentEditable = 'true'
    element.focus()
    
    // Select all text (like HTML version)
    const range = document.createRange()
    range.selectNodeContents(element)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)

    // Handle saving on blur
    const handleBlur = () => {
      const newContent = element.textContent || ''
      if (newContent !== originalContent) {
        updateField(fieldId, newContent)
        console.log(`✏️ Updated ${fieldId}:`, newContent.substring(0, 50) + '...')
      }
      finishEditing(fieldId)
    }

    // Handle keyboard shortcuts (like HTML version)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        element.blur()
      }
      if (e.key === 'Escape') {
        // Restore original content
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

  return null // This component only adds behavior, no visual elements
}
