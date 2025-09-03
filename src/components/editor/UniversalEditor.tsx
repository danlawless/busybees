'use client'

import React from 'react'
import { EditorProvider } from './EditorProvider'
import { EditorHeader } from './EditorHeader'
import { VisualEditingOverlay } from './VisualEditingOverlay'
import { EditorConfig } from '../../lib/editor/types'

interface UniversalEditorProps extends Partial<EditorConfig> {
  password: string
  children?: React.ReactNode
}

/**
 * Universal Editor - Complete Integration with Header Toolbar
 * 
 * Usage: <UniversalEditor password="your-password" />
 * 
 * Provides:
 * - Fixed header toolbar (when authenticated)
 * - Visual click-to-edit functionality
 * - Page navigation and controls
 * - Invisible when not authenticated
 */
export default function UniversalEditor({
  password,
  apiBasePath = '/api/editor',
  githubRepo = process.env.NEXT_PUBLIC_GITHUB_REPO,
  brandName = 'Universal Editor',
  colors = {
    primary: '#2563eb',
    primaryDark: '#1d4ed8',
    success: '#059669',
    error: '#dc2626'
  },
  features = {
    visualEditor: true,
    bulkEditor: true,
    githubIntegration: true,
    aiFeatures: true
  },
  children
}: UniversalEditorProps) {
  const config: EditorConfig = {
    password,
    apiBasePath,
    githubRepo,
    brandName,
    colors,
    features
  }

  return (
    <EditorProvider config={config}>
      <EditorHeader />
      {children}
      <VisualEditingOverlay />
    </EditorProvider>
  )
}
