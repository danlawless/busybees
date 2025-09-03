export interface EditorConfig {
  password: string
  apiBasePath?: string
  githubRepo?: string
  githubToken?: string
  brandName?: string
  colors?: {
    primary: string
    primaryDark: string
    success: string
    error: string
  }
  features?: {
    visualEditor: boolean
    bulkEditor: boolean
    githubIntegration: boolean
    aiFeatures: boolean
  }
}

export interface EditableField {
  id: string
  content: string
  type: 'text' | 'heading' | 'paragraph' | 'button' | 'link'
  selector: string
  context: {
    component?: string
    section?: string
    parent?: string
  }
}

export interface ContentData {
  [fieldId: string]: string
}

export interface AuthResponse {
  success: boolean
  token?: string
  message: string
}

export interface ContentResponse {
  success: boolean
  content?: ContentData
  message: string
}
