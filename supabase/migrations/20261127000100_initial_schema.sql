-- ============================================================================
-- PastCraft — 01. Initial Community Schema, Constraints, Indexes & Storage
-- Compatible with Managed Supabase and Standalone PostgreSQL 15+
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.community_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_name TEXT NOT NULL DEFAULT 'PastCraft',
  tagline TEXT NOT NULL DEFAULT 'One community. One world. Countless connections.',
  hero_heading TEXT NOT NULL DEFAULT 'A World Without Borders.',
  description TEXT NOT NULL DEFAULT 'Connecting people, stories, and adventures across the world.',
  mission TEXT NOT NULL DEFAULT 'PastCraft brings together builders, players, creators, and friends across every time zone into one shared universe.',
  founded_at DATE,
  logo_url TEXT,
  discord_url TEXT,
  youtube_channel_id TEXT,
  globe_texture TEXT NOT NULL DEFAULT 'deep-ocean' CHECK (globe_texture IN ('deep-ocean', 'night-lights', 'blue-marble')),
  show_arcs BOOLEAN NOT NULL DEFAULT true,
  star_density TEXT NOT NULL DEFAULT 'balanced' CHECK (star_density IN ('minimal', 'balanced', 'dense')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL CHECK (char_length(trim(city)) > 0),
  country TEXT NOT NULL CHECK (char_length(trim(country)) > 0),
  country_code TEXT NOT NULL CHECK (char_length(trim(country_code)) BETWEEN 2 AND 3),
  continent TEXT NOT NULL DEFAULT 'Other',
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  member_count INTEGER NOT NULL DEFAULT 1 CHECK (member_count >= 1),
  marker_color TEXT NOT NULL DEFAULT '#38bdf8' CHECK (marker_color ~ '^#[0-9A-Fa-f]{6}$'),
  description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  description TEXT NOT NULL CHECK (char_length(trim(description)) > 0),
  event_date DATE NOT NULL,
  image_url TEXT,
  external_url TEXT,
  category TEXT DEFAULT 'Foundation',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (char_length(trim(platform)) > 0),
  label TEXT NOT NULL CHECK (char_length(trim(label)) > 0),
  url TEXT NOT NULL CHECK (url ~ '^https?://'),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.featured_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_video_id TEXT NOT NULL UNIQUE CHECK (youtube_video_id ~ '^[A-Za-z0-9_-]{6,20}$'),
  title_override TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT true,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_community_locations_published
  ON public.community_locations (is_published, country, continent);

CREATE INDEX IF NOT EXISTS idx_community_locations_country_code
  ON public.community_locations (country_code);

CREATE INDEX IF NOT EXISTS idx_timeline_events_published_chronological
  ON public.timeline_events (is_published, event_date ASC, sort_order ASC);

CREATE INDEX IF NOT EXISTS idx_social_links_published_sort
  ON public.social_links (is_published, sort_order ASC);

CREATE INDEX IF NOT EXISTS idx_featured_videos_sort
  ON public.featured_videos (is_featured, is_hidden, sort_order ASC);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_settings_updated_at ON public.community_settings;
CREATE TRIGGER trg_community_settings_updated_at
  BEFORE UPDATE ON public.community_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'buckets'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('pastcraft-media', 'pastcraft-media', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END
$$;
