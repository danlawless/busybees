# 🎯 Busy Bees Editor Setup Guide

## 🔧 **Vercel Environment Variables Setup**

To enable full editor functionality with GitHub integration, you need to set these environment variables in your Vercel dashboard:

### **Required for GitHub Integration:**
```bash
GITHUB_TOKEN=your_personal_access_token_here
```

### **Optional for AI Features:**
```bash
OPENAI_API_KEY=your_openai_api_key_here
JWT_SECRET=your_custom_jwt_secret_here
```

## 📝 **How to Set Environment Variables in Vercel:**

1. **Go to Vercel Dashboard**: Visit [vercel.com](https://vercel.com) and select your project
2. **Navigate to Settings**: Click on "Settings" tab
3. **Environment Variables**: Click on "Environment Variables" in the sidebar
4. **Add Variables**: For each variable above:
   - **Name**: Enter the variable name (e.g., `GITHUB_TOKEN`)
   - **Value**: Enter the corresponding value
   - **Environment**: Select "Production" (and optionally "Preview" and "Development")
   - Click "Add"

## 🔑 **Creating a GitHub Personal Access Token:**

1. **Go to GitHub**: Visit [github.com/settings/tokens](https://github.com/settings/tokens)
2. **Generate New Token**: Click "Generate new token" → "Generate new token (classic)"
3. **Configure Token**:
   - **Note**: "Busy Bees Editor Integration"
   - **Expiration**: Choose your preferred expiration
   - **Scopes**: Select these permissions:
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (Update GitHub Action workflows)
4. **Generate**: Click "Generate token"
5. **Copy Token**: Copy the generated token immediately (you won't see it again)
6. **Add to Vercel**: Use this token as the value for `GITHUB_TOKEN`

## 🎯 **Repository Configuration:**

The editor is already configured to work with your repository:
- **Repository**: `danlawless/busybees`
- **Branch**: `main`
- **Content Paths**: Configured for Next.js structure (`src/app/**`, `src/components/**`)

## 🚀 **How It Works:**

1. **Make Edits**: Use the editor to modify content on your website
2. **Auto-Commit**: Changes are automatically committed to your GitHub repository
3. **Auto-Deploy**: Vercel detects the commits and redeploys your site
4. **Live Updates**: Your website updates with the new content

## 🔍 **Testing the Integration:**

After setting up the environment variables:

1. **Deploy**: Push your changes and let Vercel deploy
2. **Access Editor**: Visit `yoursite.com/editor/` 
3. **Login**: Use password `universal2025!`
4. **Edit Content**: Make a test edit
5. **Check GitHub**: Verify commits appear in your repository
6. **Verify Deploy**: Confirm Vercel redeploys automatically

## 🎨 **Editor Access Points:**

- **Main Dashboard**: `/editor/`
- **Visual Editor**: `/editor/visual-editor.html`
- **Bulk Editor**: `/editor/bulk-editor.html`
- **Admin Button**: Floating button on any page (when logged in)

## 🛡️ **Security Notes:**

- The editor password is `universal2025!` - consider changing this in production
- GitHub token should have minimal required permissions
- JWT secret is auto-generated if not provided
- All editor access requires authentication

---

**🎉 Your Busy Bees website now has a fully integrated content management system that commits directly to your GitHub repository!**
