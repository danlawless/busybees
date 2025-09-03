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
    if (false) { // Disabled auto-detection - window.location.pathname.startsWith('/editor')) {
      setTimeout(() => {
        console.log('🔍 Starting field detection...')
        detectFields()
      }, 2000) // Wait longer for React hydration
    }
    loadContent()
  }, [])

  const login = async (password: string): Promise<boolean> => {
    try {
      console.log('🔐 Attempting login with password:', password)
      const response = await fetch(`${config.apiBasePath}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', password })
      })
      
      console.log('📡 Auth response status:', response.status)
      const data = await response.json()
      console.log('📋 Auth response data:', data)
      
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
    console.log('🔍 Detecting fields in DOM...')
    const detectedFields: EditableField[] = []
    let fieldCounter = 0

    // More aggressive field detection for React
    const selectors = [
      'h1, h2, h3, h4, h5, h6',  // Headings
      'p',                       // Paragraphs  
      'span:not(:empty)',        // Non-empty spans
      'div:not(:has(*))',        // Divs without children
      'button',                  // Buttons
      'a:not([href^="http"])',   // Internal links
      '[data-editable]'          // Explicitly marked elements
    ]
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector)
      console.log(`Found ${elements.length} elements for selector: ${selector}`)
      
      elements.forEach(element => {
        const text = element.textContent?.trim() || ''
        
        // More lenient text filtering
        if (!text || text.length < 2 || text.length > 1000) return
        
        // Skip if element has children with text (we want leaf nodes mostly)
        const hasTextChildren = Array.from(element.children).some(child => 
          child.textContent?.trim()
        )
        if (hasTextChildren && element.children.length > 2) return
        
        // Skip if already has editor ID
        if (element.hasAttribute('data-editor-id')) return
        
        // Skip common non-content elements
        const skipClasses = ['lucide', 'icon', 'svg', 'button-icon']
        if (skipClasses.some(cls => element.className?.includes(cls))) return

        fieldCounter++
        const fieldId = `field-${fieldCounter}`
        
        const field: EditableField = {
          id: fieldId,
          content: text,
          type: getFieldType(element),
          selector: generateSelector(element),
          context: {
            component: findReactComponent(element),
            section: findSection(element),
            parent: element.parentElement?.tagName.toLowerCase()
          }
        }
        
        detectedFields.push(field)

        // Mark element for editing
        element.setAttribute('data-editor-id', fieldId)
        
        console.log(`✅ Detected field: ${fieldId} - "${text.substring(0, 50)}..."`)
      })
    })

    setFields(detectedFields)
    console.log(`🎯 Total fields detected: ${detectedFields.length}`)
    
    if (detectedFields.length === 0) {
      console.log('⚠️ No fields detected. DOM elements found:', {
        headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
        paragraphs: document.querySelectorAll('p').length,
        spans: document.querySelectorAll('span').length,
        divs: document.querySelectorAll('div').length
      })
    }
  }

  const loadContent = async () => {
    try {
      const response = await fetch(`${config.apiBasePath}/content`)
      if (response.ok) {
        const data = await response.json()
        setContent(data)
        console.log('📄 Loaded content:', Object.keys(data).length, 'entries')
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
  if (element.id) {
    selector += `#${element.id}`
  } else if (element.className) {
    const classes = element.className.split(' ').filter(c => c.trim() && !c.includes('_'))
    if (classes.length > 0) {
      selector += `.${classes.slice(0, 2).join('.')}`
    }
  }
  return selector
}

function findReactComponent(element: Element): string | undefined {
  // Try to find React component name by walking up the tree
  let current = element
  while (current && current !== document.body) {
    // Look for React Fiber properties
    const keys = Object.keys(current)
    const reactKey = keys.find(key => 
      key.startsWith('__reactInternalInstance') || 
      key.startsWith('_reactInternalInstance') ||
      key.startsWith('__reactFiber')
    )
    
    if (reactKey) {
      const instance = (current as any)[reactKey]
      const componentName = instance?.type?.name || 
                           instance?.elementType?.name ||
                           instance?.type?.displayName
      if (componentName) return componentName
    }
    
    current = current.parentElement!
  }
  return undefined
}

function findSection(element: Element): string | undefined {
  let current = element
  while (current && current !== document.body) {
    // Look for section indicators
    if (current.dataset?.component ||
        current.className?.includes('section') ||
        current.className?.includes('hero') ||
        current.className?.includes('features') ||
        current.className?.includes('pricing') ||
        ['HEADER', 'FOOTER', 'MAIN', 'NAV', 'ASIDE', 'SECTION'].includes(current.tagName)) {
      
      const className = current.className || ''
      const sectionName = className.split(' ').find(cls => 
        cls.includes('section') || 
        cls.includes('hero') || 
        cls.includes('features') ||
        cls.includes('pricing')
      ) || current.tagName.toLowerCase()
      
      return sectionName
    }
    current = current.parentElement!
  }
  return 'unknown'
}
