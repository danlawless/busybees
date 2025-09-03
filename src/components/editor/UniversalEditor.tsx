'use client'

import React from 'react'
import { EditorProvider } from './EditorProvider'
import { VisualEditor } from './VisualEditor'
import { EditorConfig } from '../../lib/editor/types'

interface UniversalEditorProps extends Partial<EditorConfig> {
  password: string
  children?: React.ReactNode
}

/**
 * Universal Editor - Complete Integration
 * 
 * Usage: <UniversalEditor password="your-password" />
 * 
 * Provides:
 * - Invisible background operation
 * - Visual click-to-edit overlay (when authenticated)
 * - Dashboard access at /editor
 * - GitHub integration
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
      {children}
      <VisualEditor />
    </EditorProvider>
  )
}
