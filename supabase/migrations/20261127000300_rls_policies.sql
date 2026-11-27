-- ============================================================================
-- PastCraft — 03. Row-Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE public.community_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_audit_logs ENABLE ROW LEVEL SECURITY;

-- Public Read Policies (Published community records only)
DROP POLICY IF EXISTS "Public can read community settings" ON public.community_settings;
CREATE POLICY "Public can read community settings"
  ON public.community_settings
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can read published locations" ON public.community_locations;
CREATE POLICY "Public can read published locations"
  ON public.community_locations
  FOR SELECT
  USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Public can read published timeline events" ON public.timeline_events;
CREATE POLICY "Public can read published timeline events"
  ON public.timeline_events
  FOR SELECT
  USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Public can read published social links" ON public.social_links;
CREATE POLICY "Public can read published social links"
  ON public.social_links
  FOR SELECT
  USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Public can read featured videos" ON public.featured_videos;
CREATE POLICY "Public can read featured videos"
  ON public.featured_videos
  FOR SELECT
  USING (is_featured = true OR is_hidden = true OR public.is_admin());

-- Authorized Administrator Mutation Policies
DROP POLICY IF EXISTS "Admins can manage community settings" ON public.community_settings;
CREATE POLICY "Admins can manage community settings"
  ON public.community_settings
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage locations" ON public.community_locations;
CREATE POLICY "Admins can manage locations"
  ON public.community_locations
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage timeline events" ON public.timeline_events;
CREATE POLICY "Admins can manage timeline events"
  ON public.timeline_events
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage social links" ON public.social_links;
CREATE POLICY "Admins can manage social links"
  ON public.social_links
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage featured videos" ON public.featured_videos;
CREATE POLICY "Admins can manage featured videos"
  ON public.featured_videos
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can read own admin record" ON public.admin_users;
CREATE POLICY "Admins can read own admin record"
  ON public.admin_users
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Owners can manage admin users" ON public.admin_users;
CREATE POLICY "Owners can manage admin users"
  ON public.admin_users
  FOR ALL
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

-- Private Administrative Audit Logs
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.website_audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON public.website_audit_logs
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.website_audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON public.website_audit_logs
  FOR INSERT
  WITH CHECK (public.is_admin());
