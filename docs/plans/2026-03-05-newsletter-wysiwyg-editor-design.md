# Newsletter WYSIWYG Editor Design

**Date:** 2026-03-05
**Status:** Approved

## Summary

Replace the plain textarea newsletter composer in the Busy Bees admin panel with an Unlayer-powered visual email editor. Staff can drag-and-drop content blocks, upload images, style text, preview, save drafts, and send.

## Architecture

### New Dependencies
- `react-email-editor` (Unlayer React wrapper)

### New Infrastructure
- **Supabase Storage bucket:** `newsletter-images` for uploaded images
- **Supabase table:** `newsletter_drafts` storing draft/sent newsletters with Unlayer JSON design + exported HTML

### New API Routes
- `POST /api/newsletter/upload-image` — image upload to Supabase Storage, returns public URL
- `GET /api/newsletter/drafts` — list saved drafts
- `POST /api/newsletter/drafts` — save/update a draft
- `DELETE /api/newsletter/drafts/[id]` — delete a draft

### Modified
- `POST /api/newsletter/send` — accepts exported HTML directly instead of building from plain text
- `AdminPanel.tsx` newsletter tab — replaces textarea with Unlayer editor component

### New Components
- `NewsletterEditor.tsx` — wraps Unlayer editor with toolbar for save draft, load draft, send, test send

### Data Flow
1. Staff opens newsletter tab -> loads Unlayer editor (optionally from saved draft)
2. Staff composes visually (drag blocks, type text, upload images)
3. Image upload -> API route -> Supabase Storage -> returns public URL -> Unlayer embeds it
4. Save draft -> exports Unlayer JSON + HTML -> stores in `newsletter_drafts`
5. Send -> exports final HTML -> sends to `/api/newsletter/send` -> Resend batch delivers

### Decisions
- **Editor:** Unlayer via `react-email-editor` (drag-and-drop, non-technical friendly)
- **Image storage:** Supabase Storage (already in stack, no new vendor)
- **Email rendering:** Unlayer default output (good enough for Gmail/Apple Mail/Outlook)
- **Drafts:** Yes, with template reuse from past newsletters
