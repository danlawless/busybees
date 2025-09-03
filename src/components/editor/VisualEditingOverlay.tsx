'use client'

import React, { useEffect, useState } from 'react'
import { useEditor } from './EditorProvider'

/**
 * Visual Editing Overlay - Click-to-edit functionality
 * Only adds behavior, no visual elements
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
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Setup visual editing when conditions are met
  useEffect(() => {
    if (!isMounted) return
    
    if (isAuthenticated && 
        isEditing && 
        typeof window !== 'undefined' && 
        window.location.pathname !== '/editor') {
      makeElementsClickToEdit()
    } else {
      removeClickToEdit()
    }

    return () => removeClickToEdit()
  }, [isMounted, isAuthenticated, isEditing, fields])

  const makeElementsClickToEdit = () => {
    if (typeof window === 'undefined') return
    
    console.log('🎨 Setting up click-to-edit for', fields.length, 'fields')
    
    fields.forEach(field => {
      const element = document.querySelector(`[data-editor-id="${field.id}"]`) as HTMLElement
      if (!element) return

      // Visual styling (matches HTML version exactly)
      element.style.position = 'relative'
      element.style.outline = '2px dashed #3498db'
      element.style.outlineOffset = '2px'
      element.style.backgroundColor = 'rgba(52, 152, 219, 0.05)'
      element.style.cursor = 'pointer'
      element.style.transition = 'all 0.2s ease'

      // Hover effects
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
      
      element.setAttribute('data-visual-editor', 'true')
    })
  }

  const removeClickToEdit = () => {
    if (typeof window === 'undefined') return
    
    const editableElements = document.querySelectorAll('[data-visual-editor="true"]')
    editableElements.forEach(element => {
      const htmlElement = element as HTMLElement
      
      // Remove all styling
      htmlElement.style.outline = ''
      htmlElement.style.outlineOffset = ''
      htmlElement.style.backgroundColor = ''
      htmlElement.style.cursor = ''
      htmlElement.style.transition = ''
      
      htmlElement.removeAttribute('contenteditable')
      htmlElement.removeAttribute('data-visual-editor')
    })
    
    setEditingElement(null)
  }

  const startEditing = (fieldId: string, element: HTMLElement) => {
    console.log('🖱️ Starting to edit:', fieldId)
    setEditingElement(fieldId)
    
    // Active editing visual (matches HTML version)
    element.style.outline = '2px solid #27ae60'
    element.style.backgroundColor = 'rgba(39, 174, 96, 0.1)'
    
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

  return null
}
