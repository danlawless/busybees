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

  // Only setup visual editing when properly mounted and authenticated
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return
    
    if (isAuthenticated && 
        fields.length > 0 &&
        window.location.pathname !== '/editor') {
      
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
    if (typeof window === 'undefined') return
    
    console.log('🎨 Showing visual indicators for', fields.length, 'fields')
    
    fields.forEach(field => {
      const element = document.querySelector(`[data-editor-id="${field.id}"]`) as HTMLElement
      if (!element) return

      // Blue boxes like HTML version
      element.style.position = 'relative'
      element.style.outline = '2px dashed #3498db'
      element.style.outlineOffset = '2px'
      element.style.backgroundColor = 'rgba(52, 152, 219, 0.05)'
      element.style.transition = 'all 0.2s ease'
      
      // Add field type label
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

      element.setAttribute('data-visual-indicator', 'true')
    })
  }

  const makeElementsClickToEdit = () => {
    if (typeof window === 'undefined') return
    
    fields.forEach(field => {
      const element = document.querySelector(`[data-editor-id="${field.id}"]`) as HTMLElement
      if (!element) return

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
    
    const allElements = document.querySelectorAll('[data-visual-indicator="true"]')
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
      htmlElement.removeAttribute('data-visual-indicator')
      htmlElement.removeAttribute('data-click-editor')
    })
    
    setEditingElement(null)
  }

  const startEditing = (fieldId: string, element: HTMLElement) => {
    console.log('🖱️ Starting to edit:', fieldId)
    setEditingElement(fieldId)
    
    // Green outline for active editing
    element.style.outline = '2px solid #27ae60'
    element.style.backgroundColor = 'rgba(39, 174, 96, 0.15)'
    
    const originalContent = element.textContent || ''
    element.setAttribute('data-original-content', originalContent)
    
    element.contentEditable = 'true'
    element.focus()
    
    // Select all text
    if (typeof window !== 'undefined') {
      try {
        const range = document.createRange()
        range.selectNodeContents(element)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
      } catch (error) {
        console.log('Selection error:', error)
      }
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

  // This component only adds behavior, no visual elements
  return null
}
