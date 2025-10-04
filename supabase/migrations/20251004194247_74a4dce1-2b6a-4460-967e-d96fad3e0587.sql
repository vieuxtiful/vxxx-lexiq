-- ============================================
-- PHASE 3: ENTERPRISE HARDENING MIGRATIONS
-- ============================================

-- 1. SECURITY: Enable leaked password protection
-- (This will be done via supabase/config.toml)

-- 2. MULTI-TENANCY: Add pending_invitations table
CREATE TABLE IF NOT EXISTS public.pending_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token VARCHAR UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on pending_invitations
ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pending_invitations
CREATE POLICY "Org admins can view pending invitations"
ON public.pending_invitations FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Org admins can create invitations"
ON public.pending_invitations FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Org admins can delete invitations"
ON public.pending_invitations FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 3. AUDIT LOGGING: Add audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  action VARCHAR NOT NULL,
  resource_type VARCHAR NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON public.audit_logs(organization_id);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs
CREATE POLICY "Users can view own audit logs"
ON public.audit_logs FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Org admins can view org audit logs"
ON public.audit_logs FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);

-- 4. Add updated_at trigger for pending_invitations
CREATE TRIGGER update_pending_invitations_updated_at
BEFORE UPDATE ON public.pending_invitations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();