'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { EditorConfig, EditableField, ContentData } from '../../lib/editor/types'

interface EditorContextType {
  config: EditorConfig
  isAuthenticated: boolean
  isEditing: boolean
  fields: EditableField[]
  content: ContentData
  login: (password: string) => Promise<boolean>
  logout: () => void
  toggleEditing: () => void
  updateField: (fieldId: string, content: string) => void
  detectFields: () => void
  saveContent: () => Promise<boolean>
}

const EditorContext = createContext<EditorContextType | null>(null)

export function useEditor() {
  const context = useContext(EditorContext)
  if (!context) {
    throw new Error('useEditor must be used within EditorProvider')
  }
  return context
}

interface EditorProviderProps {
  config: EditorConfig
  children: React.ReactNode
}

export function EditorProvider({ config, children }: EditorProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [fields, setFields] = useState<EditableField[]>([])
  const [content, setContent] = useState<ContentData>({})
  const [authToken, setAuthToken] = useState<string>('')

  useEffect(() => {
    // Only detect fields when not on the editor page itself
    if (!window.location.pathname.startsWith('/editor')) {
      setTimeout(() => detectFields(), 1000) // Wait for React hydration
    }
    loadContent()
  }, [])

  const login = async (password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${config.apiBasePath}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', password })
      })
      
      const data = await response.json()
      if (data.success) {
        setAuthToken(data.token)
        setIsAuthenticated(true)
        return true
      }
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = () => {
    setAuthToken('')
    setIsAuthenticated(false)
    setIsEditing(false)
  }

  const toggleEditing = () => {
    setIsEditing(!isEditing)
  }

  const updateField = (fieldId: string, newContent: string) => {
    setContent(prev => ({ ...prev, [fieldId]: newContent }))
  }

  const detectFields = () => {
    const detectedFields: EditableField[] = []
    let fieldCounter = 0

    // Find all text elements
    const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, button, a')
    
    textElements.forEach(element => {
      const text = element.textContent?.trim() || ''
      
      // Skip if no text or too short/long
      if (!text || text.length < 3 || text.length > 500) return
      
      // Skip if element has children (we want leaf nodes)
      if (element.children.length > 0) return
      
      // Skip if already has editor ID
      if (element.hasAttribute('data-editor-id')) return

      fieldCounter++
      const fieldId = `field-${fieldCounter}`
      
      detectedFields.push({
        id: fieldId,
        content: text,
        type: getFieldType(element),
        selector: generateSelector(element),
        context: {
          component: findReactComponent(element),
          section: findSection(element),
          parent: element.parentElement?.tagName.toLowerCase()
        }
      })

      // Mark element for editing
      element.setAttribute('data-editor-id', fieldId)
    })

    setFields(detectedFields)
    console.log(`🔍 Universal Editor: Detected ${detectedFields.length} editable fields`)
  }

  const loadContent = async () => {
    try {
      const response = await fetch(`${config.apiBasePath}/content`)
      if (response.ok) {
        const data = await response.json()
        setContent(data)
      }
    } catch (error) {
      console.error('Failed to load content:', error)
    }
  }

  const saveContent = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${config.apiBasePath}/content`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ action: 'save', content })
      })
      
      const data = await response.json()
      return data.success
    } catch (error) {
      console.error('Save error:', error)
      return false
    }
  }

  const value: EditorContextType = {
    config,
    isAuthenticated,
    isEditing,
    fields,
    content,
    login,
    logout,
    toggleEditing,
    updateField,
    detectFields,
    saveContent
  }

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  )
}

// Helper functions
function getFieldType(element: Element): EditableField['type'] {
  const tag = element.tagName.toLowerCase()
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) return 'heading'
  if (tag === 'p') return 'paragraph'
  if (tag === 'button') return 'button'
  if (tag === 'a') return 'link'
  return 'text'
}

function generateSelector(element: Element): string {
  let selector = element.tagName.toLowerCase()
  if (element.id) selector += `#${element.id}`
  if (element.className) {
    const classes = element.className.split(' ').filter(c => c.trim())
    if (classes.length > 0) selector += `.${classes.slice(0, 2).join('.')}`
  }
  return selector
}

function findReactComponent(element: Element): string | undefined {
  // Try to find React component name
  let current = element
  while (current && current !== document.body) {
    const keys = Object.keys(current)
    const reactKey = keys.find(key => key.startsWith('__reactInternalInstance') || key.startsWith('_reactInternalInstance'))
    if (reactKey) {
      const instance = (current as any)[reactKey]
      return instance?.type?.name || instance?.elementType?.name
    }
    current = current.parentElement!
  }
  return undefined
}

function findSection(element: Element): string | undefined {
  let current = element
  while (current && current !== document.body) {
    if (current.dataset?.component ||
        current.className?.includes('section') ||
        ['HEADER', 'FOOTER', 'MAIN', 'NAV', 'ASIDE'].includes(current.tagName)) {
      return current.className || current.tagName.toLowerCase()
    }
    current = current.parentElement!
  }
  return undefined
}
