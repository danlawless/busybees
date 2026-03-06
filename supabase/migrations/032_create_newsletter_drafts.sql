-- Newsletter Drafts table for WYSIWYG editor
-- Stores Unlayer design JSON and exported HTML for reuse/editing
CREATE TABLE IF NOT EXISTS newsletter_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  design_json JSONB NOT NULL DEFAULT '{}',
  html TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
  sent_at TIMESTAMPTZ,
  sent_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_newsletter_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_newsletter_drafts_updated_at
  BEFORE UPDATE ON newsletter_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_newsletter_drafts_updated_at();

-- RLS
ALTER TABLE newsletter_drafts ENABLE ROW LEVEL SECURITY;

-- Only authenticated users (admin) can manage drafts
CREATE POLICY "Authenticated users can manage newsletter drafts"
  ON newsletter_drafts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for newsletter images
INSERT INTO storage.buckets (id, name, public)
VALUES ('newsletter-images', 'newsletter-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload newsletter images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'newsletter-images');

-- Allow public read access to newsletter images (needed for email rendering)
CREATE POLICY "Public can view newsletter images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'newsletter-images');

-- Allow authenticated users to delete their uploaded images
CREATE POLICY "Authenticated users can delete newsletter images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'newsletter-images');
