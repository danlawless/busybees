-- Migration 028: Create events table and storage bucket
-- Supports posting special events (e.g., Galentine's Party) with Canva graphics

-- Create event_status enum
CREATE TYPE event_status AS ENUM ('draft', 'published', 'cancelled');

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time_start TIME NOT NULL,
  event_time_end TIME,
  status event_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for public queries (published events ordered by date)
CREATE INDEX idx_events_status_date ON events (status, event_date);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_events_updated_at();

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Public can read published events
CREATE POLICY "Public can view published events"
  ON events FOR SELECT
  USING (status = 'published');

-- Staff/admin can view all events
CREATE POLICY "Staff can view all events"
  ON events FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('staff', 'admin')
    )
  );

-- Staff/admin can insert events
CREATE POLICY "Staff can create events"
  ON events FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('staff', 'admin')
    )
  );

-- Staff/admin can update events
CREATE POLICY "Staff can update events"
  ON events FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('staff', 'admin')
    )
  );

-- Staff/admin can delete events
CREATE POLICY "Staff can delete events"
  ON events FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('staff', 'admin')
    )
  );

-- Create storage bucket for event images
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read event images
CREATE POLICY "Public can view event images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-images');

-- Staff/admin can upload event images
CREATE POLICY "Staff can upload event images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'event-images'
    AND auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('staff', 'admin')
    )
  );

-- Staff/admin can update event images
CREATE POLICY "Staff can update event images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'event-images'
    AND auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('staff', 'admin')
    )
  );

-- Staff/admin can delete event images
CREATE POLICY "Staff can delete event images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'event-images'
    AND auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('staff', 'admin')
    )
  );
