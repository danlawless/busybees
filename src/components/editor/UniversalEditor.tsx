'use client'

import React from 'react'
import { EditorProvider } from './EditorProvider'
import { EditorConfig } from '../../lib/editor/types'

interface UniversalEditorProps extends Partial<EditorConfig> {
  password: string
  children?: React.ReactNode
}

/**
 * Universal Editor - One-Line React Integration
 * 
 * Drop this component anywhere in your Next.js app to enable editing:
 * <UniversalEditor password="your-password" />
 * 
 * Features:
 * - Automatic field detection
 * - Visual editing overlay
 * - GitHub integration
 * - Content management dashboard
 * - Zero configuration required
 */
export default function UniversalEditor(props: UniversalEditorProps) {
  const config: EditorConfig = {
    password: props.password,
    apiBasePath: props.apiBasePath || '/api/editor',
    githubRepo: props.githubRepo || process.env.NEXT_PUBLIC_GITHUB_REPO,
    githubToken: props.githubToken || process.env.GITHUB_TOKEN,
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
      {props.children}
    </EditorProvider>
  )
}
