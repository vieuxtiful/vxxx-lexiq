-- ============================================
-- Phase 1A & 1B: Enterprise Database Schema + RLS
-- ============================================

-- Step 1: Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'member', 'viewer');

-- Step 2: Organizations table
CREATE TABLE public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    plan_type VARCHAR(50) DEFAULT 'starter' CHECK (plan_type IN ('starter', 'professional', 'enterprise')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: User profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: User roles table (CRITICAL SECURITY - separate table)
CREATE TABLE public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id, role)
);

-- Step 5: Projects table
CREATE TABLE public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'en',
    domain VARCHAR(50) DEFAULT 'general',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: File uploads table
CREATE TABLE public.file_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('translation', 'glossary')),
    file_name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    file_size INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 7: Analysis sessions table
CREATE TABLE public.analysis_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    translation_file_id UUID REFERENCES public.file_uploads(id) ON DELETE SET NULL,
    glossary_file_id UUID REFERENCES public.file_uploads(id) ON DELETE SET NULL,
    language VARCHAR(10) NOT NULL,
    domain VARCHAR(50) NOT NULL,
    analyzed_terms JSONB NOT NULL DEFAULT '[]',
    statistics JSONB DEFAULT '{}',
    processing_time FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 8: Glossaries table
CREATE TABLE public.glossaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    terms JSONB NOT NULL DEFAULT '[]',
    is_shared BOOLEAN DEFAULT false,
    language VARCHAR(10) NOT NULL,
    domain VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 9: Create indexes for performance
CREATE INDEX idx_profiles_organization ON public.profiles(organization_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_org ON public.user_roles(organization_id);
CREATE INDEX idx_projects_user ON public.projects(user_id);
CREATE INDEX idx_projects_org ON public.projects(organization_id);
CREATE INDEX idx_file_uploads_project ON public.file_uploads(project_id);
CREATE INDEX idx_analysis_sessions_project ON public.analysis_sessions(project_id);
CREATE INDEX idx_analysis_sessions_user ON public.analysis_sessions(user_id);
CREATE INDEX idx_glossaries_org ON public.glossaries(organization_id);
CREATE INDEX idx_glossaries_user ON public.glossaries(user_id);

-- Step 10: Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- Step 11: Trigger function for new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 12: Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_organizations
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_projects
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_glossaries
    BEFORE UPDATE ON public.glossaries
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glossaries ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Organizations policies (basic - can be enhanced later)
CREATE POLICY "Users can view own organization"
    ON public.organizations FOR SELECT
    USING (
        id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- User roles policies
CREATE POLICY "Users can view own roles"
    ON public.user_roles FOR SELECT
    USING (user_id = auth.uid());

-- Projects policies
CREATE POLICY "Users can view own projects"
    ON public.projects FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create own projects"
    ON public.projects FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own projects"
    ON public.projects FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own projects"
    ON public.projects FOR DELETE
    USING (user_id = auth.uid());

-- File uploads policies
CREATE POLICY "Users can view own files"
    ON public.file_uploads FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can upload files"
    ON public.file_uploads FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own files"
    ON public.file_uploads FOR DELETE
    USING (user_id = auth.uid());

-- Analysis sessions policies
CREATE POLICY "Users can view own analysis sessions"
    ON public.analysis_sessions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create analysis sessions"
    ON public.analysis_sessions FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own analysis sessions"
    ON public.analysis_sessions FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own analysis sessions"
    ON public.analysis_sessions FOR DELETE
    USING (user_id = auth.uid());

-- Glossaries policies (with sharing support)
CREATE POLICY "Users can view own or shared glossaries"
    ON public.glossaries FOR SELECT
    USING (
        user_id = auth.uid() OR
        (is_shared = true AND organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        ))
    );

CREATE POLICY "Users can create glossaries"
    ON public.glossaries FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own glossaries"
    ON public.glossaries FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own glossaries"
    ON public.glossaries FOR DELETE
    USING (user_id = auth.uid());

-- ============================================
-- Storage Buckets
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('translation-files', 'translation-files', false),
    ('glossary-files', 'glossary-files', false);

-- Storage policies for translation files
CREATE POLICY "Users can upload translation files"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'translation-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own translation files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'translation-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own translation files"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'translation-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policies for glossary files
CREATE POLICY "Users can upload glossary files"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'glossary-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own glossary files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'glossary-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own glossary files"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'glossary-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );