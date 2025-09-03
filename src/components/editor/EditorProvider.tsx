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
  const [isMounted, setIsMounted] = useState(false)

  // Ensure component is mounted before any DOM operations
  useEffect(() => {
    setIsMounted(true)
    
    // Only load content when on editor page
    if (typeof window !== 'undefined' && window.location.pathname === '/editor') {
      loadContent()
    }
  }, [])

  const login = async (password: string): Promise<boolean> => {
    try {
      console.log('🔐 Attempting login...')
      const response = await fetch(`${config.apiBasePath}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', password })
      })
      
      const data = await response.json()
      console.log('📋 Auth response:', data)
      
      if (data.success) {
        setAuthToken(data.token)
        setIsAuthenticated(true)
        // Detect fields after successful login
        setTimeout(() => detectFields(), 500)
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
    if (!isMounted || typeof window === 'undefined') return
    
    console.log('🔍 Detecting fields...')
    const detectedFields: EditableField[] = []
    let fieldCounter = 0

    const currentPage = window.location.pathname
    console.log('📍 Scanning page:', currentPage)

    // Skip detection on editor page itself
    if (currentPage === '/editor') {
      console.log('⏭️ Skipping detection on editor page')
      return
    }

    // Scan for editable content
    const selectors = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'button', 'a']
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector)
      
      elements.forEach(element => {
        const text = element.textContent?.trim() || ''
        
        // Filter for meaningful content
        if (!text || text.length < 3 || text.length > 500) return
        if (element.children.length > 3) return // Skip containers
        if (element.hasAttribute('data-editor-id')) return // Skip already detected
        
        fieldCounter++
        const fieldId = `${currentPage.replace('/', '') || 'home'}-field-${fieldCounter}`
        
        const field: EditableField = {
          id: fieldId,
          content: text,
          type: getFieldType(element),
          selector: generateSelector(element),
          context: {
            component: 'React Component',
            section: findSection(element),
            parent: element.parentElement?.tagName.toLowerCase()
          }
        }
        
        detectedFields.push(field)
        element.setAttribute('data-editor-id', fieldId)
        
        console.log(`✅ Detected: ${fieldId}`)
      })
    })

    setFields(detectedFields)
    console.log(`🎯 Total: ${detectedFields.length} fields`)
  }

  const loadContent = async () => {
    try {
      const response = await fetch(`${config.apiBasePath}/content`)
      if (response.ok) {
        const data = await response.json()
        setContent(data)
        console.log('📄 Content loaded')
      }
    } catch (error) {
      console.error('Content load error:', error)
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

function findSection(element: Element): string | undefined {
  if (typeof window === 'undefined') return 'unknown'
  
  let current = element
  while (current && current !== document.body) {
    if (current.className?.includes('section') ||
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
