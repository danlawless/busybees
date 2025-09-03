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
 * Universal Editor - Clean Header Integration
 * 
 * Usage: <UniversalEditor password="your-password" />
 * 
 * Provides:
 * - Fixed header toolbar when authenticated
 * - Click-to-edit functionality  
 * - Invisible when not authenticated
 * - Exact replica of HTML version UX
 */
export default function UniversalEditor(props: UniversalEditorProps) {
  const config: EditorConfig = {
    password: props.password,
    apiBasePath: props.apiBasePath || '/api/editor',
    githubRepo: props.githubRepo || process.env.NEXT_PUBLIC_GITHUB_REPO,
    brandName: props.brandName || 'Universal Editor',
    colors: {
      primary: '#2563eb',
      primaryDark: '#1d4ed8',
      success: '#059669',
      error: '#dc2626',
      ...props.colors
    },
    features: {
      visualEditor: true,
      bulkEditor: true,
      githubIntegration: true,
      aiFeatures: true,
      ...props.features
    }
  }

  return (
    <EditorProvider config={config}>
      <EditorHeader />
      {props.children}
      <VisualEditingOverlay />
    </EditorProvider>
  )
}
