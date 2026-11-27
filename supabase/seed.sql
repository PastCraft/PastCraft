-- ============================================================================
-- PastCraft — Initial Seed Data
-- ============================================================================

INSERT INTO public.community_settings (
  id,
  community_name,
  tagline,
  hero_heading,
  description,
  mission,
  founded_at,
  discord_url,
  globe_texture,
  show_arcs,
  star_density
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'PastCraft',
  'One community. One world. Countless connections.',
  'A World Without Borders.',
  'Connecting people, stories, and adventures across the world.',
  'PastCraft brings together players, builders, storytellers, and friends across every time zone into one welcoming universe grounded in shared adventures, creativity, and lasting camaraderie.',
  '2022-04-12',
  'https://discord.gg/NNXXb9DKJv',
  'deep-ocean',
  true,
  'balanced'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_locations (city, country, country_code, continent, latitude, longitude, member_count, marker_color, description, is_published)
VALUES
  ('London', 'United Kingdom', 'GB', 'Europe', 51.5074, -0.1278, 148, '#38bdf8', 'European hub hosting weekly community voice lounges and collaborative builds.', true),
  ('New York', 'United States', 'US', 'North America', 40.7128, -74.0060, 214, '#38bdf8', 'East Coast chapter coordinating global town halls and seasonal server events.', true),
  ('San Francisco', 'United States', 'US', 'North America', 37.7749, -122.4194, 132, '#7dd3fc', 'West Coast builders, redstone engineers, and late-night creative sessions.', true),
  ('Toronto', 'Canada', 'CA', 'North America', 43.6532, -79.3832, 96, '#38bdf8', 'Canadian community cluster active in game nights and storytelling events.', true),
  ('Tokyo', 'Japan', 'JP', 'Asia', 35.6762, 139.6503, 164, '#60a5fa', 'Asia-Pacific creative chapter leading build showcases and music listening rooms.', true),
  ('Singapore', 'Singapore', 'SG', 'Asia', 1.3521, 103.8198, 88, '#38bdf8', 'Southeast Asian crossroads connecting APAC and European time zones.', true),
  ('Seoul', 'South Korea', 'KR', 'Asia', 37.5665, 126.9780, 109, '#7dd3fc', 'Digital art, streaming collaborations, and multilingual community hosts.', true),
  ('Berlin', 'Germany', 'DE', 'Europe', 52.5200, 13.4050, 121, '#38bdf8', 'Central European chapter organizing annual PastCraft meetups and buildathons.', true),
  ('São Paulo', 'Brazil', 'BR', 'South America', -23.5505, -46.6333, 117, '#38bdf8', 'Largest South American hub bringing vibrant regional events and Portuguese-English exchanges.', true),
  ('Buenos Aires', 'Argentina', 'AR', 'South America', -34.6037, -58.3816, 64, '#7dd3fc', 'Southern Cone storytellers, builders, and community video contributors.', true),
  ('Sydney', 'Australia', 'AU', 'Oceania', -33.8688, 151.2093, 93, '#60a5fa', 'Oceania chapter kicking off every global weekend event first across the dateline.', true),
  ('Nairobi', 'Kenya', 'KE', 'Africa', -1.2921, 36.8219, 57, '#38bdf8', 'East African community builders mentoring newcomers and hosting survival expeditions.', true),
  ('Cairo', 'Egypt', 'EG', 'Africa', 30.0444, 31.2357, 49, '#7dd3fc', 'MENA & North African hub bridging Mediterranean, African, and Asian members.', true),
  ('Stockholm', 'Sweden', 'SE', 'Europe', 59.3293, 18.0686, 72, '#60a5fa', 'Nordic chapter leading worldbuilding, sound design, and winter festival streams.', true);

INSERT INTO public.timeline_events (title, description, event_date, category, external_url, sort_order, is_published)
VALUES
  ('PastCraft First Signal', 'PastCraft began as a late-night Discord server and survival world connecting twenty friends across four time zones.', '2022-04-12', 'Foundation', NULL, 1, true),
  ('Season 1 Realm Launch', 'Opened the first shared PastCraft Minecraft server where members built the Founding Citadel and international rail network.', '2022-08-19', 'Minecraft server milestones', NULL, 2, true),
  ('Global Atlas Initiative', 'Members voluntarily mapped the first 25 cities represented in PastCraft, inspiring our borderless world identity.', '2022-11-05', 'Community expansion', NULL, 3, true),
  ('First 24-Hour Global Relay', 'Hosted a continuous 24-hour live community event passed westward from Sydney to Tokyo, Berlin, London, São Paulo, and New York.', '2023-06-18', 'Community events', NULL, 4, true),
  ('PastCraft YouTube Archive Launch', 'Launched the official PastCraft YouTube channel featuring world tours, event recaps, and collaborative documentaries.', '2024-02-09', 'Important announcements', 'https://www.youtube.com/@PastCraft', 5, true),
  ('1,000+ Members Across Six Continents', 'Celebrated surpassing one thousand PastCraft members spanning six continents and over a dozen regional hubs.', '2025-03-22', 'Achievements', NULL, 6, true),
  ('PastCraft Universe Platform 1.0', 'Unveiled our interactive 3D Earth home on the web—uniting our living global map, history timeline, and media gallery under one starfield.', '2026-09-14', 'Important announcements', NULL, 7, true);

INSERT INTO public.social_links (platform, label, url, sort_order, is_published)
VALUES
  ('discord', 'Join PastCraft Discord', 'https://discord.gg/NNXXb9DKJv', 1, true),
  ('youtube', 'PastCraft on YouTube', 'https://www.youtube.com/@PastCraft', 2, true),
  ('x', 'Follow Updates on X', 'https://x.com/pastcraft', 3, true),
  ('instagram', 'Visual Stories on Instagram', 'https://instagram.com/pastcraft', 4, true),
  ('tiktok', 'Highlights on TikTok', 'https://tiktok.com/@pastcraft', 5, true),
  ('github', 'Open Source on GitHub', 'https://github.com/pastcraft', 6, true);
