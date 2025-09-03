'use client'

import React, { useState, useEffect } from 'react'
import { EditorProvider } from './EditorProvider'
import { EditorHeader } from './EditorHeader'
import { VisualEditingOverlay } from './VisualEditingOverlay'
import { EditorConfig } from '../../lib/editor/types'

interface UniversalEditorProps extends Partial<EditorConfig> {
  password: string
  children?: React.ReactNode
}

/**
 * Universal Editor - Client-Side Only Integration
 * Prevents all SSR/hydration issues by only rendering after mount
 */
export default function UniversalEditor(props: UniversalEditorProps) {
  const [isMounted, setIsMounted] = useState(false)

  // Only render after client-side mount to prevent hydration issues
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Don't render anything during SSR
  if (!isMounted) {
    return <>{props.children}</>
  }

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
